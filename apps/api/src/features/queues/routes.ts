import { queueQuerySchema, workingDaysSince, type QueueKind } from '@par/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { reportDependencies } from '../reports/application/workflow-context';

/**
 * Review and approval queues (spec §7.3, UI spec §7.9). Same template, two
 * roles: the waiting time is the submission on the review queue and the
 * endorsement on the approval queue.
 */
function queueRouter(kind: QueueKind) {
  const router = new Hono<AppEnv>();
  router.use('*', requireSession);

  router.get('/queue', requireRole(kind === 'review' ? 'REVIEWER' : 'APPROVER'), async (c) => {
    const parsed = queueQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: 'That queue filter is not supported',
            details: parsed.error.issues,
          },
        },
        400,
      );
    }

    const page = await reportDependencies(c).read.queue(kind, parsed.data);
    const viewerId = c.get('userId');

    return c.json({
      items: page.rows.map((row) => ({
        id: row.id,
        ownerUserId: row.ownerUserId,
        submitterName: row.submitterName || 'Account removed',
        trackingNumber: row.trackingNumber,
        title: row.title,
        type: row.type,
        status: row.status,
        campusId: row.campusId,
        collegeId: row.unitId,
        college: row.unitName ?? '',
        waitingSince: (kind === 'review' ? row.submittedAt : row.endorsedAt) ?? row.updatedAt,
        hasPendingAttachments: row.pendingAttachments,
        // An admin's own report stays in the queue, marked rather than hidden.
        isOwn: row.ownerUserId === viewerId,
      })),
      total: page.total,
      page: parsed.data.page,
      size: parsed.data.size,
      oldestAgeDays: page.oldestWaitingAt ? workingDaysSince(page.oldestWaitingAt) : 0,
      facets: page.facets,
    });
  });

  return router;
}

export const reviewQueueRoutes = queueRouter('review');
export const approvalQueueRoutes = queueRouter('approval');

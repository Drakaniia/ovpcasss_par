import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { signedDownloadUrl } from '../../lib/download-url';
import { requireSession } from '../../middleware/auth';
import { canViewReport } from '../reports/domain/report-access';
import { reportDependencies, viewerOf } from '../reports/application/workflow-context';
import { ensureStoredAcknowledgement } from './application/render-acknowledgement';

/**
 * The approved report's acknowledgement (spec §7.10). The PDF is generated and
 * stored on approval; requesting it repairs a missing render without changing
 * the report's state.
 */
export const acknowledgementRoutes = new Hono<AppEnv>();

acknowledgementRoutes.use('*', requireSession);

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
}

function notApproved(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: 'REPORT_NOT_APPROVED',
        message: 'The acknowledgement is available only after the report is approved.',
      },
    },
    409,
  );
}

acknowledgementRoutes.get('/:id/acknowledgement', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row || !canViewReport(viewer, row.ownerUserId)) return notFound(c);
  if (row.status !== 'APPROVED') return notApproved(c);

  const objectKey = await ensureStoredAcknowledgement(c.env, row);
  const url = await signedDownloadUrl(
    c,
    objectKey,
    `/api/v1/reports/${row.id}/acknowledgement/file`,
  );

  return c.json({
    url,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
});

acknowledgementRoutes.get('/:id/acknowledgement/file', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row || !canViewReport(viewer, row.ownerUserId)) return notFound(c);
  if (row.status !== 'APPROVED') return notApproved(c);

  const objectKey = await ensureStoredAcknowledgement(c.env, row);
  const object = await c.env.BUCKET.get(objectKey);
  if (!object) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'The acknowledgement could not be read.' } },
      404,
    );
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'EXPORTED',
    entityType: 'report',
    entityId: row.id,
    comment: 'Acknowledgement downloaded',
  });

  return new Response(object.body as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="Acknowledgement-${row.trackingNumber ?? row.id}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
});

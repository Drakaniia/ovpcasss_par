import { actsAs, decisionNoteSchema, returnReportSchema } from '@par/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { ensureStoredAcknowledgement } from '../../acknowledgement/application/render-acknowledgement';
import { canDecide, canViewReport } from '../domain/report-access';
import { buildReportDetail } from './report-detail';
import type { DecisionKind } from './report-workflow';
import { decideReportRow } from './report-workflow';
import { reportDependencies, transitionActor, viewerOf, workflowFor } from './workflow-context';

const REQUIRED_ROLE: Record<DecisionKind, 'REVIEWER' | 'APPROVER'> = {
  ENDORSE: 'REVIEWER',
  REVIEWER_RETURN: 'REVIEWER',
  APPROVE: 'APPROVER',
  APPROVER_RETURN: 'APPROVER',
};

/** Both decision route groups use this one handler, so the rules cannot drift. */
export async function handleDecision(c: Context<AppEnv>, kind: DecisionKind): Promise<Response> {
  const viewer = viewerOf(c);
  if (!viewer) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const stack = reportDependencies(c);
  const row = await stack.read.findById((c.req.param('id') ?? ''));
  if (!row) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
  }
  if (!canViewReport(viewer, row.ownerUserId)) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
  }
  if (!actsAs(viewer.role, REQUIRED_ROLE[kind])) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Your role cannot make this decision' } },
      403,
    );
  }
  if (!canDecide(viewer, row.ownerUserId)) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot review or approve a report you submitted',
        },
      },
      403,
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const isReturn = kind === 'REVIEWER_RETURN' || kind === 'APPROVER_RETURN';
  const parsed = isReturn
    ? returnReportSchema.safeParse(body)
    : decisionNoteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the decision before submitting it',
          details: parsed.error.issues,
        },
      },
      400,
    );
  }

  const actor = await transitionActor(c, stack.users);
  if (!actor) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const submitter = await stack.users.findById(row.ownerUserId);
  const workflow = await workflowFor(c, stack);
  const data = parsed.data;
  const outcome = await decideReportRow(workflow, row, {
    kind,
    actor,
    submitter,
    ...('note' in data && data.note !== undefined ? { note: data.note } : {}),
    ...('comments' in data ? { comments: data.comments } : {}),
    ...('notifySubmitter' in data ? { notifySubmitter: data.notifySubmitter } : {}),
  });

  if (outcome.kind !== 'ok') {
    return c.json(
      {
        error: {
          code: 'REPORT_NOT_PENDING',
          message: 'This report is no longer awaiting your decision.',
        },
      },
      409,
    );
  }

  await recordAudit(c, {
    actorUserId: actor.id,
    actorRole: viewer.role,
    action: outcome.action,
    entityType: 'report',
    entityId: outcome.row.id,
    fromStatus: outcome.from,
    toStatus: outcome.to,
    ...('comments' in data ? { comment: data.comments } : {}),
  });

  if (kind === 'APPROVE') {
    await ensureStoredAcknowledgement(c.env, outcome.row).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Acknowledgement could not be generated',
          reportId: outcome.row.id,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
    });
  }

  const detail = await buildReportDetail(
    { read: stack.read, users: stack.users, audit: stack.audit },
    outcome.row.id,
  );

  return detail
    ? c.json(detail)
    : c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
}

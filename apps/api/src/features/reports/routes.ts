import { createIdempotencyQueries, type ReportRow } from '@par/db';
import {
  reportFormSchema,
  reportListQuerySchema,
  reportSearchQuerySchema,
  type ReportDraftForm,
  type ReportStatus,
  type SubmitReportResponse,
} from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { buildReportDetail } from './application/report-detail';
import { reportListFilter } from './application/report-list';
import { toReportSearchItem } from './application/report-search';
import { canEditReport, canViewReport, reportSearchScope } from './domain/report-access';
import { toDetailForm, toReportHead, toReportListItem } from './application/report-shape';
import { submitReportRow, validateStoredReport } from './application/report-workflow';
import {
  reportDependencies,
  transitionActor,
  viewerOf,
  workflowFor,
} from './application/workflow-context';
import { registerReportPdfRoutes } from './pdf-routes';

/** States a report can be edited in (spec §7.5): draft and both returns. */
const EDITABLE: readonly ReportStatus[] = ['DRAFT', 'RETURNED_BY_REVIEWER', 'RETURNED_BY_APPROVER'];

/**
 * Draft create, list, detail, edit, validate, submit, and resubmit (spec §7.3).
 * Sub-resources live in their own routers and are merged onto `/reports` in
 * `app.ts`; the state machine itself is in `@par/shared`.
 */
export const reportRoutes = new Hono<AppEnv>();

reportRoutes.use('*', requireSession);

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to manage reports' } }, 401);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
}

function forbidden(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'FORBIDDEN', message } }, 403);
}

function conflict(c: Context<AppEnv>, code = 'REPORT_NOT_PENDING') {
  return c.json(
    {
      error: {
        code,
        message: 'This report changed on the server. Reload it and try again.',
      },
    },
    409,
  );
}

function invalid(c: Context<AppEnv>, details: unknown, message = 'Check the highlighted fields') {
  return c.json({ error: { code: 'VALIDATION_ERROR', message, details } }, 400);
}

function versionFrom(c: Context<AppEnv>): number | undefined | null {
  const header = c.req.header('if-match');
  if (header === undefined || header.trim() === '') return undefined;

  const value = Number(header);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function partialForm(body: unknown): ReportDraftForm | null {
  const parsed = reportFormSchema.partial().safeParse(body);
  return parsed.success ? (parsed.data as ReportDraftForm) : null;
}

function editable(viewer: NonNullable<ReturnType<typeof viewerOf>>, row: ReportRow): boolean {
  return canEditReport(viewer, row.ownerUserId, row.status);
}

reportRoutes.get('/', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const parsed = reportListQuerySchema.safeParse(c.req.query());
  if (!parsed.success)
    return invalid(c, parsed.error.issues, 'That report filter is not supported');

  const stack = reportDependencies(c);
  const term = parsed.data.term ? await stack.read.findTerm(parsed.data.term) : null;
  const [page, facets] = await Promise.all([
    stack.read.list(
      reportListFilter(viewer, parsed.data, {
        from: parsed.data.from ?? term?.startsOn,
        to: parsed.data.to ?? term?.endsOn,
      }),
    ),
    stack.read.listFacets(),
  ]);

  return c.json({
    items: page.rows.map(toReportListItem),
    total: page.total,
    page: parsed.data.page,
    size: parsed.data.size,
    facets,
  });
});

/**
 * The command palette's report half (phase 12 §4). Registered before `/:id`,
 * which would otherwise read `search` as a report id. The scope is the same
 * rule `canViewReport` enforces row by row, applied in the query.
 */
reportRoutes.get('/search', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const parsed = reportSearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return invalid(c, parsed.error.issues, 'That search is not valid');

  const stack = reportDependencies(c);
  const term = parsed.data.q ?? '';
  const rows = await stack.read.search({
    ...(term ? { term } : {}),
    scope: reportSearchScope(viewer),
    limit: parsed.data.limit,
  });

  return c.json({ items: rows.map((row) => toReportSearchItem(row, term)) });
});

reportRoutes.post('/', requireRole('SUBMITTER'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const form = partialForm(await c.req.json().catch(() => null));
  if (!form) return invalid(c, [], 'The draft is not valid');

  const stack = reportDependencies(c);
  const now = new Date().toISOString();
  const row = await stack.write.insertDraft({
    id: crypto.randomUUID(),
    ownerUserId: viewer.userId,
    form,
    now,
  });

  await stack.write.replaceLists(row.id, form.sdgIds ?? [], form.pics ?? []);

  return c.json(toReportHead(row), 201);
});

reportRoutes.get('/:id', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canViewReport(viewer, row.ownerUserId)) return notFound(c);

  const detail = await buildReportDetail(
    { read: stack.read, users: stack.users, audit: stack.audit },
    row.id,
  );

  return detail ? c.json(detail) : notFound(c);
});

reportRoutes.get('/:id/events', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row || !canViewReport(viewer, row.ownerUserId)) return notFound(c);

  const detail = await buildReportDetail(
    { read: stack.read, users: stack.users, audit: stack.audit },
    row.id,
  );

  return c.json({ items: detail?.history ?? [] });
});

reportRoutes.patch('/:id', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!editable(viewer, row)) {
    return canViewReport(viewer, row.ownerUserId)
      ? forbidden(c, 'Only the submitter can edit this report.')
      : notFound(c);
  }

  const version = versionFrom(c);
  if (version === null) return invalid(c, [], 'The report version is not valid');

  const patch = partialForm(await c.req.json().catch(() => null));
  if (!patch) return invalid(c, [], 'The report changes are not valid');

  const [pics, sdgIds] = await Promise.all([
    stack.read.listPics(row.id),
    stack.read.listSdgIds(row.id),
  ]);
  const merged = {
    ...(toDetailForm(row, pics, sdgIds) as ReportDraftForm),
    ...patch,
  };

  const changed = await stack.write.updateDraft({
    id: row.id,
    form: merged,
    now: new Date().toISOString(),
    ...(version === undefined ? {} : { version }),
    from: EDITABLE,
  });

  if (!changed) return conflict(c, 'CONFLICT');

  await stack.write.replaceLists(changed.id, merged.sdgIds ?? [], merged.pics ?? []);

  return c.json(toReportHead(changed));
});

reportRoutes.delete('/:id', requireRole('SUBMITTER'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (row.ownerUserId !== viewer.userId) return notFound(c);
  if (row.status !== 'DRAFT') {
    return conflict(c, 'REPORT_NOT_DRAFT');
  }

  const attachments = await stack.read.listAttachments(row.id);
  await Promise.all(
    attachments.map((attachment) =>
      c.env.BUCKET.delete(attachment.objectKey).catch(() => undefined),
    ),
  );

  if (!(await stack.write.deleteDraft(row.id))) return conflict(c, 'REPORT_NOT_DRAFT');

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'DRAFT_DELETED',
    entityType: 'report',
    entityId: row.id,
    comment: 'Draft deleted with its attachments',
  });

  return c.body(null, 204);
});

reportRoutes.post('/:id/validate', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!editable(viewer, row)) {
    return canViewReport(viewer, row.ownerUserId)
      ? forbidden(c, 'Only the submitter can validate this report.')
      : notFound(c);
  }

  const issues = await validateStoredReport(await workflowFor(c, stack), row);
  return c.json({ valid: issues.length === 0, issues });
});

async function submit(c: Context<AppEnv>, resubmit: boolean) {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const row = await stack.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (row.ownerUserId !== viewer.userId) return notFound(c);

  const action = resubmit ? 'resubmit' : 'submit';
  const key = c.req.header('idempotency-key')?.trim();
  const requestHash = `${action}:${row.id}`;
  const idempotency = createIdempotencyQueries(stack.db);

  // A retried submit must replay even though the first one already moved the
  // report out of DRAFT; checking the key first is what makes the retry safe.
  if (key) {
    const replay = await idempotency.find(key, viewer.userId);
    if (replay) {
      if (replay.requestHash !== requestHash) return conflict(c, 'IDEMPOTENCY_KEY_REUSED');
      return c.json(JSON.parse(replay.response) as SubmitReportResponse);
    }
  }

  const expected: readonly ReportStatus[] = resubmit
    ? ['RETURNED_BY_REVIEWER', 'RETURNED_BY_APPROVER']
    : ['DRAFT'];
  if (!expected.includes(row.status)) return conflict(c);

  const version = versionFrom(c);
  if (version === null) return invalid(c, [], 'The report version is not valid');

  const actor = await transitionActor(c, stack.users);
  if (!actor) return unauthorized(c);

  const workflow = await workflowFor(c, stack);
  const outcome = await submitReportRow(workflow, row, {
    resubmit,
    actor,
    ...(version === undefined ? {} : { version }),
  });

  if (outcome.kind === 'invalid') {
    return invalid(c, outcome.issues, 'The report is not ready to submit');
  }
  if (outcome.kind === 'conflict') return conflict(c);

  const response: SubmitReportResponse = {
    id: outcome.row.id,
    version: outcome.row.version,
    status: outcome.row.status,
    trackingNumber: outcome.row.trackingNumber ?? '',
    ...(outcome.row.submittedAt ? { submittedAt: outcome.row.submittedAt } : {}),
    updatedAt: outcome.row.updatedAt,
  };

  await recordAudit(c, {
    actorUserId: actor.id,
    actorRole: viewer.role,
    action: outcome.action,
    entityType: 'report',
    entityId: outcome.row.id,
    fromStatus: outcome.from,
    toStatus: outcome.to,
  });

  if (key) {
    await idempotency.save({
      key,
      userId: viewer.userId,
      requestHash,
      response: JSON.stringify(response),
      now: workflow.now,
    });
  }

  return c.json(response);
}

reportRoutes.post('/:id/submit', requireRole('SUBMITTER'), (c) => submit(c, false));
reportRoutes.post('/:id/resubmit', requireRole('SUBMITTER'), (c) => submit(c, true));

registerReportPdfRoutes(reportRoutes);

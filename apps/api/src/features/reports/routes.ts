import {
  createAttachmentQueries,
  createAuditQueries,
  createDb,
  createReceiptQueries,
  createReportReadQueries,
  createReportWriteQueries,
  createUserQueries,
  type ReportPicRow,
  type ReportRow,
} from '@par/db';
import {
  formatReferenceNo,
  reportActivitySchema,
  reportCompletedDateSchema,
  reportDecisionSchema,
  reportDeleteQuerySchema,
  reportListQuerySchema,
  reportNarrativeSchema,
  reportSearchQuerySchema,
  reportUpdateSchema,
  sourcesFor,
  issuesFromZodError,
  validateActivity,
  validateNarrative,
  type ReportListItem,
} from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { sendReturnedEmail, sendSubmittedEmail } from '../../email/report-mail';
import { appOrigin } from '../../lib/app-origin';
import { recordAudit } from '../../lib/audit';
import { signedDownloadUrl } from '../../lib/download-url';
import {
  findStoredResponse,
  idempotencyKey,
  requestFingerprint,
  storeResponse,
} from '../../lib/idempotency';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { notify } from '../notifications/application/notify';
import { issueReceipts, renderReceiptBytes } from '../receipts/application/issue-receipts';
import {
  canArchive,
  canDecide,
  canDeleteArchivedRecord,
  canDeleteRecord,
  canManageRecord,
  canReadNarrative,
  canSetCompletedDate,
  canWriteNarrative,
  isAdmin,
  type Viewer,
} from './domain/report-access';
import { changedActivityFields } from './application/change-summary';
import { toReportSearchItem } from './application/report-search';
import { ensurePicAccounts, mailAssignedPics, mailRemovedPics } from './application/pic-accounts';
import { buildReportDetail } from './application/report-detail';
import { toAttachment, toReportHead, toReportListItem } from './application/record-shape';
import {
  r2SignatureStorage,
  snapshotApprovalSignature,
  snapshotSubmittedSignature,
} from './application/signature-snapshot';
import { registerReportPdfRoutes } from './pdf-routes';
import { registerReportSignatureRoutes } from './signature-routes';

export const reportRoutes = new Hono<AppEnv>();

reportRoutes.use('*', requireSession);

function viewerOf(c: Context<AppEnv>): Viewer | null {
  const userId = c.get('userId');
  if (!userId) return null;
  return { userId, role: c.get('role') };
}

function stack(c: Context<AppEnv>) {
  const db = createDb(c.env.DB);
  return {
    db,
    read: createReportReadQueries(db),
    write: createReportWriteQueries(db),
    attachments: createAttachmentQueries(db),
    users: createUserQueries(db),
    audit: createAuditQueries(db),
    receipts: createReceiptQueries(db),
  };
}

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'This record does not exist' } }, 404);
}

function forbidden(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'FORBIDDEN', message } }, 403);
}

function conflict(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'REPORT_CHANGED', message } }, 409);
}

function idempotencyConflict(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'This request key was already used for a different request.',
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

async function detailOf(
  c: Context<AppEnv>,
  row: ReportRow,
): Promise<Awaited<ReturnType<typeof buildReportDetail>>> {
  const viewer = viewerOf(c);
  if (!viewer) throw new Error('Sign in to continue');
  const read = stack(c).read;
  const isPic = await read.isPic(row.id, viewer.userId);
  return buildReportDetail(c.env, row, {
    canWriteNarrative: canWriteNarrative(viewer, row),
    canManage: canManageRecord(viewer, row.status),
    canArchive: canArchive(viewer, row.status),
    canSetCompletedDate: canSetCompletedDate(viewer, row.status),
    concealNarrative: !canReadNarrative(viewer, row, isPic),
    ...(isAdmin(viewer) ? {} : { receiptsForUserId: viewer.userId }),
  });
}

async function picUsers(c: Context<AppEnv>, pics: readonly ReportPicRow[]) {
  const users = stack(c).users;
  return Promise.all(pics.map((pic) => (pic.userId ? users.findById(pic.userId) : null)));
}

/* ---------- Palette search ---------- */

/**
 * Palette documents (phase 12 §4). Registered before `/:id`, which would
 * otherwise read `search` as a report id. An empty query is the recent group,
 * ordered by last edit; the register is open to every signed-in account
 * (spec §5), so the palette never offers more than the rest of the app.
 */
reportRoutes.get('/search', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const parsed = reportSearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return invalid(c, parsed.error.issues, 'That search is not valid');

  const term = parsed.data.q ?? '';
  const admin = isAdmin(viewer);
  const rows = await stack(c).read.search({
    viewer: { userId: viewer.userId, isAdmin: admin },
    ...(term ? { q: term } : {}),
    limit: parsed.data.limit,
  });

  return c.json({
    items: rows.map((row) =>
      toReportSearchItem(
        row,
        term,
        admin || row.status === 'PENDING' || row.submittedByUserId === viewer.userId,
      ),
    ),
  });
});

/* ---------- Register ---------- */

reportRoutes.get('/', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const parsed = reportListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return invalid(c, parsed.error.issues, 'That filter is not supported');

  const store = stack(c);
  const page = await store.read.list({
    viewer: { userId: viewer.userId, isAdmin: isAdmin(viewer) },
    tab: parsed.data.tab,
    archived: parsed.data.archived,
    type: parsed.data.type,
    campus: parsed.data.campus,
    from: parsed.data.from,
    to: parsed.data.to,
    q: parsed.data.q,
    picName: parsed.data.picName,
    submittedBy: parsed.data.submittedBy,
    sort: parsed.data.sort,
    dir: parsed.data.dir,
    page: parsed.data.page,
    size: parsed.data.size,
  });

  const submitters = await store.read.submitterNames(page.rows.map((row) => row.id));
  const items: ReportListItem[] = [];
  for (const row of page.rows) {
    items.push(
      toReportListItem(row, await store.read.listPics(row.id), submitters.get(row.id) ?? null),
    );
  }

  return c.json({
    items,
    total: page.total,
    page: parsed.data.page,
    size: parsed.data.size,
    facets: await store.read.listFacets(),
  });
});

reportRoutes.post('/', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const body = await c.req.json().catch(() => null);
  const parsed = reportActivitySchema.safeParse(body);
  if (!parsed.success) return invalid(c, issuesFromZodError(parsed.error));
  const issues = validateActivity(parsed.data);
  if (issues.length > 0) return invalid(c, issues);

  const store = stack(c);
  const key = idempotencyKey(c);
  const fingerprint = key ? await requestFingerprint(body) : '';
  if (key) {
    const stored = await findStoredResponse(store.db, key, viewer.userId);
    if (stored) {
      if (stored.requestHash !== fingerprint) return idempotencyConflict(c);
      return c.json(JSON.parse(stored.response), 201);
    }
  }

  const origin = appOrigin(c);
  const now = new Date().toISOString();
  const sequence = await store.write.nextReferenceSequence();
  const referenceNo = formatReferenceNo(sequence);
  const assigned = await ensurePicAccounts(c.env, parsed.data.pics, origin);

  const row = await store.write.insertRecord({
    id: crypto.randomUUID(),
    referenceNo,
    sequence,
    createdByUserId: viewer.userId,
    form: parsed.data,
    now,
  });

  await store.write.replaceLists(
    row.id,
    parsed.data.sdgIds,
    assigned.map((pic) => ({
      userId: pic.userId,
      name: pic.name,
      email: pic.email,
      phone: pic.phone,
      invitedAt: now,
    })),
  );

  await mailAssignedPics(
    c.env,
    assigned,
    {
      referenceNo,
      title: row.title,
      activityDate: row.activityStartDate,
      location: row.location,
      origin,
    },
    row.id,
  );

  for (const pic of assigned) {
    if (!pic.userId) continue;
    await notify(c.env, {
      userId: pic.userId,
      kind: 'ASSIGNED',
      description: `${referenceNo} was assigned to you`,
      target: { kind: 'report', reportId: row.id },
    });
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_CREATED',
    entityType: 'report',
    entityId: row.id,
    toStatus: 'PENDING',
    comment: referenceNo,
  });

  const pics = await store.read.listPics(row.id);
  const created = { ...toReportHead(row), pics, sentTo: pics.length };
  if (key) {
    await storeResponse(
      store.db,
      { key, userId: viewer.userId, requestHash: fingerprint, response: JSON.stringify(created) },
      now,
    );
  }

  return c.json(created, 201);
});

reportRoutes.patch('/:id', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canManageRecord(viewer, row.status)) {
    return forbidden(c, 'An approved record can no longer be changed.');
  }

  const parsed = reportUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c, issuesFromZodError(parsed.error));
  const { reason, ...form } = parsed.data;
  const issues = validateActivity(form);
  if (issues.length > 0) return invalid(c, issues);

  const version = versionFrom(c);
  if (version === null) return conflict(c, 'The record version is not valid.');

  const [before, beforeSdgIds] = await Promise.all([
    store.read.listPics(row.id),
    store.read.listSdgIds(row.id),
  ]);
  const changedFields = changedActivityFields({ row, beforePics: before, beforeSdgIds, form });
  if (changedFields.length === 0) {
    return c.json({ ...toReportHead(row), changedFields: [] });
  }

  const submitted = row.status === 'SUBMITTED' || row.status === 'RETURNED';
  if (submitted && !reason) {
    return invalid(
      c,
      [{ field: 'reason', message: 'Write why the activity details were corrected.' }],
      'A correction after submission needs a reason',
    );
  }

  const now = new Date().toISOString();
  const origin = appOrigin(c);
  const byEmail = new Map(before.map((pic) => [pic.email, pic]));

  const fresh = form.pics.filter((pic) => !byEmail.has(pic.email.toLowerCase()));
  const assigned = fresh.length > 0 ? await ensurePicAccounts(c.env, fresh, origin) : [];

  const updated = await store.write.updateRecord({
    id: row.id,
    form,
    now,
    ...(version === undefined ? {} : { version }),
    from: ['PENDING', 'SUBMITTED', 'RETURNED'],
  });
  if (!updated) return conflict(c, 'This record changed on the server. Reload it and try again.');

  const keep = new Map(assigned.map((pic) => [pic.email, pic]));
  await store.write.replaceLists(
    row.id,
    form.sdgIds,
    form.pics.map((pic) => {
      const email = pic.email.toLowerCase();
      const previous = byEmail.get(email);
      const created = keep.get(email);
      return {
        id: previous?.id,
        userId: previous?.userId ?? created?.userId ?? null,
        name: pic.name,
        email,
        phone: pic.phone ?? previous?.phone ?? null,
        invitedAt: previous?.invitedAt ?? now,
      };
    }),
  );

  const nowEmails = new Set(form.pics.map((pic) => pic.email.toLowerCase()));
  const removed = before.filter((pic) => !nowEmails.has(pic.email));
  if (removed.length > 0) {
    await mailRemovedPics(
      c.env,
      removed,
      { referenceNo: row.referenceNo, title: row.title },
      row.id,
    );
  }
  if (assigned.length > 0) {
    await mailAssignedPics(
      c.env,
      assigned,
      {
        referenceNo: row.referenceNo,
        title: row.title,
        activityDate: row.activityStartDate,
        location: row.location,
        origin,
      },
      row.id,
    );

    for (const pic of assigned) {
      if (!pic.userId) continue;
      await notify(c.env, {
        userId: pic.userId,
        kind: 'ASSIGNED',
        description: `${row.referenceNo} was assigned to you`,
        target: { kind: 'report', reportId: row.id },
      });
    }
  }

  const retained = before.filter((pic) => nowEmails.has(pic.email) && pic.userId);
  if (submitted && retained.length > 0) {
    for (const pic of retained) {
      await notify(c.env, {
        userId: pic.userId ?? '',
        kind: 'RECORD_EDITED',
        description: `${row.referenceNo} activity details were corrected`,
        ...(reason ? { comment: reason } : {}),
        target: { kind: 'report', reportId: row.id },
        email: {
          kind: 'RECORD_EDITED',
          to: pic.email,
          referenceNo: row.referenceNo,
          title: form.title,
          changedFields,
          ...(reason ? { reason } : {}),
          origin,
        },
      });
    }
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_UPDATED',
    entityType: 'report',
    entityId: row.id,
    fromStatus: row.status,
    toStatus: updated.status,
    comment: reason ? `${changedFields.join(', ')}: ${reason}` : row.referenceNo,
  });

  return c.json({ ...toReportHead(updated), changedFields });
});

reportRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);

  const parsed = reportDeleteQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return invalid(c, issuesFromZodError(parsed.error));

  // Two deletion paths: a record with no narrative, and a filed one (2026-10-27).
  const pending = canDeleteRecord(viewer, row.status);
  const filed = canDeleteArchivedRecord(viewer, row);
  if (!pending && !filed) {
    return forbidden(
      c,
      row.status === 'APPROVED'
        ? 'Archive the record before deleting it.'
        : 'Only a record with no submitted narrative can be deleted.',
    );
  }

  const attachments = await store.read.listAttachments(row.id);
  for (const attachment of attachments) {
    await c.env.BUCKET.delete(attachment.objectKey).catch(() => undefined);
  }

  // A filed record was approved, so a receipt may already be in a PIC's hands.
  const issued = filed ? await store.receipts.listForReport(row.id) : [];
  if (parsed.data.receipts === 'void') {
    for (const receipt of issued) {
      await c.env.BUCKET.delete(receipt.objectKey).catch(() => undefined);
    }
  }

  const deleted = await store.write.deleteRecord(row.id);
  if (!deleted) return conflict(c, 'This record changed on the server. Reload it and try again.');

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_DELETED',
    entityType: 'report',
    entityId: row.id,
    fromStatus: row.status,
    comment: row.referenceNo,
  });

  // A filed deletion closes its gap: later records move down one, so the next
  // record takes the number the deletion freed (2026-10-27 decision).
  const shifts = filed ? await store.write.renumberAfter(deleted.sequence) : [];
  for (const shift of shifts) {
    await recordAudit(c, {
      actorUserId: viewer.userId,
      actorRole: viewer.role,
      action: 'RECORD_RENUMBERED',
      entityType: 'report',
      entityId: shift.reportId,
      comment: `${formatReferenceNo(shift.from)} → ${formatReferenceNo(shift.to)}`,
    });
  }

  return c.json({
    referenceNo: row.referenceNo,
    renumbered: shifts.length,
    nextReferenceNo: formatReferenceNo(deleted.sequence + shifts.length),
    receiptsVoided: parsed.data.receipts === 'void' ? issued.length : 0,
  });
});

/* ---------- Archive (a filing flag, never a transition) ---------- */

reportRoutes.post('/:id/archive', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canArchive(viewer, row.status)) {
    return forbidden(c, 'Only an approved record can be archived.');
  }

  if (row.archivedAt) return c.json(toReportHead(row));

  const now = new Date().toISOString();
  const archived = await store.write.setArchived(row.id, {
    archivedAt: now,
    archivedByUserId: viewer.userId,
  });
  if (!archived) return conflict(c, 'This record changed on the server. Reload it and try again.');

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_ARCHIVED',
    entityType: 'report',
    entityId: row.id,
    comment: row.referenceNo,
  });

  return c.json(toReportHead(archived));
});

reportRoutes.delete('/:id/archive', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!row.archivedAt) return c.json(toReportHead(row));

  const archived = await store.write.setArchived(row.id, {
    archivedAt: null,
    archivedByUserId: null,
  });
  if (!archived) return conflict(c, 'This record changed on the server. Reload it and try again.');

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_UNARCHIVED',
    entityType: 'report',
    entityId: row.id,
    comment: row.referenceNo,
  });

  return c.json(toReportHead(archived));
});

/* ---------- Date Completed (the sheet's date, not the decision's) ---------- */

reportRoutes.patch('/:id/completed-date', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canSetCompletedDate(viewer, row.status)) {
    return forbidden(c, 'Only an approved record carries a completion date.');
  }

  const parsed = reportCompletedDateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c, issuesFromZodError(parsed.error));

  const version = versionFrom(c);
  if (version === null) return conflict(c, 'The record version is not valid.');

  const completedOn = parsed.data.completedOn;
  if (row.completedOn === completedOn) return c.json(toReportHead(row));

  const updated = await store.write.setCompletedOn({
    id: row.id,
    completedOn,
    now: new Date().toISOString(),
    ...(version === undefined ? {} : { version }),
  });
  if (!updated) return conflict(c, 'This record changed on the server. Reload it and try again.');

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_COMPLETED_DATE_SET',
    entityType: 'report',
    entityId: row.id,
    comment: `Date Completed: ${row.completedOn ?? 'approval date'} → ${completedOn ?? 'approval date'}`,
  });

  return c.json(toReportHead(updated));
});

reportRoutes.get('/:id', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);

  return c.json(await detailOf(c, row));
});

/* ---------- Narrative ---------- */

reportRoutes.put('/:id/narrative', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canWriteNarrative(viewer, row)) {
    return forbidden(c, 'This record is not open for a narrative edit.');
  }

  const parsed = reportNarrativeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c, issuesFromZodError(parsed.error));

  const version = versionFrom(c);
  if (version === null) return conflict(c, 'The record version is not valid.');

  const updated = await store.write.setNarrative({
    id: row.id,
    narrative: parsed.data.narrative,
    now: new Date().toISOString(),
    ...(version === undefined ? {} : { version }),
    from: ['PENDING', 'RETURNED'],
  });
  if (!updated) return conflict(c, 'This record changed on the server. Reload it and try again.');

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'NARRATIVE_SAVED',
    entityType: 'report',
    entityId: row.id,
    comment: row.referenceNo,
  });

  return c.json(toReportHead(updated));
});

reportRoutes.post('/:id/submit', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  const isPic = await store.read.isPic(row.id, viewer.userId);
  if (viewer.role !== 'PERSONNEL' && !isAdmin(viewer)) {
    return forbidden(c, 'Only personnel in charge may submit a narrative.');
  }

  const key = idempotencyKey(c);
  const fingerprint = key ? await requestFingerprint({ reportId: row.id }) : '';
  if (key) {
    const stored = await findStoredResponse(store.db, key, viewer.userId);
    if (stored) {
      if (stored.requestHash !== fingerprint) return idempotencyConflict(c);
      return c.json(JSON.parse(stored.response));
    }
  }

  if (row.status !== 'PENDING' && row.status !== 'RETURNED') {
    return conflict(c, 'This narrative has already been submitted.');
  }

  // A returned narrative is private to the PIC who submitted it: another PIC
  // never sees the words, so the same account resubmits them.
  if (!canWriteNarrative(viewer, row)) {
    return forbidden(c, 'Only the personnel in charge who submitted this narrative may resubmit it.');
  }

  const attachments = await store.read.listAttachments(row.id);
  const pending = await store.read.pendingAttachmentReports([row.id]);
  const issues = validateNarrative(row.narrative, {
    attachments: pending.has(row.id)
      ? [...attachments, { label: '', status: 'PENDING' as const }]
      : attachments,
  });
  if (issues.length > 0) return invalid(c, issues);

  const version = versionFrom(c);
  if (version === null) return conflict(c, 'The record version is not valid.');

  const submitter = await store.users.findById(viewer.userId);
  const now = new Date().toISOString();

  // Claiming: a PIC who was never named on the record joins it at submission,
  // so approval still issues their OVPCASSS-F-013 (spec §5, §10).
  if (!isPic && viewer.role === 'PERSONNEL' && submitter) {
    await store.write.addPic({
      reportId: row.id,
      userId: submitter.id,
      name: submitter.fullName,
      email: submitter.email,
      now,
    });
  }

  const snapshot = await snapshotSubmittedSignature({
    reportId: row.id,
    reportSignatureKey: row.narrativeSignatureKey,
    signatureCleared: row.narrativeSignatureCleared,
    profileSignatureKey: submitter?.signatureObjectKey ?? null,
    signedAt: now,
    storage: r2SignatureStorage(c.env.BUCKET),
  });

  const updated = await store.write.changeStatus(row.id, {
    to: 'SUBMITTED',
    from: sourcesFor('SUBMITTED'),
    ...(version === undefined ? {} : { version }),
    now,
    patch: {
      narrative: row.narrative,
      submittedAt: row.submittedAt ?? now,
      submittedByUserId: viewer.userId,
      ...(snapshot ?? {}),
    },
  });
  if (!updated) return conflict(c, 'This record changed on the server. Reload it and try again.');

  if (snapshot) {
    await recordAudit(c, {
      actorUserId: viewer.userId,
      actorRole: viewer.role,
      action: 'SIGNATURE_ATTACHED',
      entityType: 'report',
      entityId: row.id,
      comment: row.referenceNo,
    });
  }
  const admins = await store.users.listActiveByRole('ADMIN');
  for (const admin of admins) {
    await notify(c.env, {
      userId: admin.id,
      kind: 'SUBMITTED',
      description: `${row.referenceNo} is ready for review`,
      target: { kind: 'report', reportId: row.id },
    });
    await sendSubmittedEmail(
      c.env,
      admin.email,
      {
        referenceNo: row.referenceNo,
        title: row.title,
        submitterName: submitter?.fullName,
        approvedAt: now,
        origin: appOrigin(c),
      },
      row.id,
    );
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'NARRATIVE_SUBMITTED',
    entityType: 'report',
    entityId: row.id,
    fromStatus: row.status,
    toStatus: 'SUBMITTED',
    comment: row.referenceNo,
  });

  const submitted = { ...toReportHead(updated), submittedAt: now };
  if (key) {
    await storeResponse(
      store.db,
      { key, userId: viewer.userId, requestHash: fingerprint, response: JSON.stringify(submitted) },
      now,
    );
  }

  return c.json(submitted);
});

/* ---------- Office decision ---------- */

reportRoutes.post('/:id/decision', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canDecide(viewer, row.status)) {
    return conflict(c, 'Only a submitted narrative can be decided.');
  }

  const parsed = reportDecisionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c, issuesFromZodError(parsed.error));
  if (parsed.data.decision === 'RETURN' && !parsed.data.comments?.trim()) {
    return invalid(c, [{ field: 'comments', message: 'Write what the PIC should change.' }]);
  }

  const now = new Date().toISOString();
  const approving = parsed.data.decision === 'APPROVE';
  const approver = approving ? await store.users.findById(viewer.userId) : null;
  const approvalSnapshot = approving
    ? await snapshotApprovalSignature({
        reportId: row.id,
        profileSignatureKey: approver?.signatureObjectKey ?? null,
        signedAt: now,
        storage: r2SignatureStorage(c.env.BUCKET),
      })
    : null;

  const updated = await store.write.changeStatus(row.id, {
    to: approving ? 'APPROVED' : 'RETURNED',
    from: sourcesFor(approving ? 'APPROVED' : 'RETURNED'),
    now,
    patch: approving
      ? {
          approvedAt: now,
          approvedByUserId: viewer.userId,
          ...(approvalSnapshot ?? {}),
        }
      : { approvedAt: null, approvedByUserId: null },
  });
  if (!updated) return conflict(c, 'This record changed on the server. Reload it and try again.');

  if (parsed.data.comments) {
    const round = (await store.write.countReturns(row.id)) + 1;
    await store.write.insertComment({
      id: crypto.randomUUID(),
      reportId: row.id,
      authorUserId: viewer.userId,
      kind: approving ? 'OFFICE_NOTE' : 'RETURN',
      round,
      body: parsed.data.comments,
      createdAt: now,
    });
  }

  const pics = await store.read.listPics(row.id);
  const recipients = await picUsers(c, pics);
  const origin = appOrigin(c);

  for (const [index, pic] of pics.entries()) {
    if (!pic.userId) continue;
    // A returned narrative is private to its submitter, so the office's note
    // travels only to them; an approval is still news for every PIC.
    if (!approving && row.submittedByUserId && pic.userId !== row.submittedByUserId) continue;
    await notify(c.env, {
      userId: pic.userId,
      kind: approving ? 'APPROVED' : 'RETURNED',
      description: approving
        ? `${row.referenceNo} was approved`
        : `${row.referenceNo} was returned for revision`,
      ...(approving ? {} : { comment: parsed.data.comments ?? null }),
      target: { kind: 'report', reportId: row.id },
      // The approval is its own message; the receipt follows as a separate one
      // with the PDF attached, so neither has to carry the other's news.
      ...(approving
        ? {
            email: {
              kind: 'APPROVED',
              to: pic.email,
              referenceNo: row.referenceNo,
              title: row.title,
              picName: pic.name,
              approvedAt: now,
              origin,
            },
          }
        : {}),
    });

    const recipient = recipients[index];
    if (!recipient) continue;
    if (approving) continue;
    await sendReturnedEmail(
      c.env,
      recipient.email,
      {
        referenceNo: row.referenceNo,
        title: row.title,
        comments: parsed.data.comments,
        origin,
      },
      row.id,
    );
  }

  if (approving) {
    await issueReceipts(c.env, updated, pics, origin);
  }

  if (approvalSnapshot) {
    await recordAudit(c, {
      actorUserId: viewer.userId,
      actorRole: viewer.role,
      action: 'SIGNATURE_ATTACHED',
      entityType: 'report',
      entityId: row.id,
      comment: row.referenceNo,
    });
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: approving ? 'NARRATIVE_APPROVED' : 'NARRATIVE_RETURNED',
    entityType: 'report',
    entityId: row.id,
    fromStatus: 'SUBMITTED',
    toStatus: updated.status,
    ...(parsed.data.comments ? { comment: parsed.data.comments } : {}),
  });

  return c.json(toReportHead(updated));
});

reportRoutes.post('/:id/invitation', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (row.status === 'APPROVED') return conflict(c, 'This record is already approved.');

  const pics = await store.read.listPics(row.id);
  const origin = appOrigin(c);
  for (const pic of pics) {
    await mailAssignedPics(
      c.env,
      [
        {
          userId: pic.userId ?? '',
          name: pic.name,
          email: pic.email,
          phone: pic.phone,
          newAccount: false,
        },
      ],
      {
        referenceNo: row.referenceNo,
        title: row.title,
        activityDate: row.activityStartDate,
        location: row.location,
        origin,
      },
      row.id,
    );
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'INVITATION_RESENT',
    entityType: 'report',
    entityId: row.id,
    comment: row.referenceNo,
  });

  return c.json({ sentTo: pics.length });
});

/* ---------- Receipts ---------- */

reportRoutes.get('/:id/receipts', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);

  const rows = await store.receipts.listForReport(row.id);
  const mine = isAdmin(viewer)
    ? rows
    : rows.filter((receipt) => receipt.recipientUserId === viewer.userId);

  return c.json({
    items: mine.map((receipt) => ({
      id: receipt.id,
      recipientName: receipt.recipientName,
      generatedAt: receipt.generatedAt,
      ...(receipt.emailedAt ? { emailedAt: receipt.emailedAt } : {}),
    })),
  });
});

reportRoutes.get('/:id/receipts/:receiptId/file', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);

  const receipt = await store.receipts.findById(c.req.param('receiptId') ?? '');
  if (!receipt || receipt.reportId !== row.id) return notFound(c);
  if (!isAdmin(viewer) && receipt.recipientUserId !== viewer.userId) return notFound(c);

  const pic = (await store.read.listPics(row.id)).find(
    (candidate) => candidate.id === receipt.recipientPicId,
  );
  if (!pic) return notFound(c);

  // The form is re-rendered from the approved record on every request, so a
  // copy issued before the receipt layout was corrected still prints the
  // current form. A render failure falls back to the copy stored at approval.
  let body: BodyInit;
  try {
    const bytes = await renderReceiptBytes(c.env, row, pic);
    await c.env.BUCKET.put(receipt.objectKey, bytes, {
      httpMetadata: { contentType: 'application/pdf' },
    });
    body = bytes as unknown as BodyInit;
  } catch {
    const stored = await c.env.BUCKET.get(receipt.objectKey);
    if (!stored) return notFound(c);
    body = stored.body as BodyInit;
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECEIPT_DOWNLOADED',
    entityType: 'report',
    entityId: row.id,
    comment: receipt.recipientName,
  });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="OVPCASSS-F-013-${receipt.recipientName.replaceAll(/[^0-9A-Za-z]+/g, '-')}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
});

/* ---------- Attachments ---------- */

reportRoutes.get('/:id/attachments/:attachmentId/url', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);

  const attachment = await store.attachments.findById(row.id, c.req.param('attachmentId') ?? '');
  if (!attachment || attachment.status !== 'CONFIRMED') return notFound(c);

  const url = await signedDownloadUrl(
    c,
    attachment.objectKey,
    `/api/v1/reports/${row.id}/attachments/${attachment.id}/file`,
  );
  return c.json({ url, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() });
});

registerReportPdfRoutes(reportRoutes);
registerReportSignatureRoutes(reportRoutes);

export { toAttachment };

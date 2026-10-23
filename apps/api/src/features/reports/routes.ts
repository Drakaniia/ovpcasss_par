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
  reportDecisionSchema,
  reportListQuerySchema,
  reportNarrativeSchema,
  sourcesFor,
  validateActivity,
  validateNarrative,
  type ReportListItem,
} from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { sendReturnedEmail, sendSubmittedEmail } from '../../email/report-mail';
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
  canDecide,
  canDeleteRecord,
  canManageRecord,
  canViewReport,
  canWriteNarrative,
  isAdmin,
  type Viewer,
} from './domain/report-access';
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
    canWriteNarrative: canWriteNarrative(viewer, isPic, row.status),
    canManage: canManageRecord(viewer, row.status),
    ...(isAdmin(viewer) ? {} : { receiptsForUserId: viewer.userId }),
  });
}

async function picUsers(c: Context<AppEnv>, pics: readonly ReportPicRow[]) {
  const users = stack(c).users;
  return Promise.all(pics.map((pic) => (pic.userId ? users.findById(pic.userId) : null)));
}

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
    type: parsed.data.type,
    campus: parsed.data.campus,
    from: parsed.data.from,
    to: parsed.data.to,
    q: parsed.data.q,
    sort: parsed.data.sort,
    dir: parsed.data.dir,
    page: parsed.data.page,
    size: parsed.data.size,
  });

  const items: ReportListItem[] = [];
  for (const row of page.rows) {
    items.push(toReportListItem(row, await store.read.listPics(row.id)));
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
  if (!parsed.success) return invalid(c, parsed.error.issues);
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

  const origin = new URL(c.req.url).origin;
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
    toStatus: 'DRAFT',
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

  const parsed = reportActivitySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c, parsed.error.issues);
  const issues = validateActivity(parsed.data);
  if (issues.length > 0) return invalid(c, issues);

  const version = versionFrom(c);
  if (version === null) return conflict(c, 'The record version is not valid.');

  const before = await store.read.listPics(row.id);
  const now = new Date().toISOString();
  const origin = new URL(c.req.url).origin;
  const byEmail = new Map(before.map((pic) => [pic.email, pic]));

  const fresh = parsed.data.pics.filter((pic) => !byEmail.has(pic.email.toLowerCase()));
  const assigned = fresh.length > 0 ? await ensurePicAccounts(c.env, fresh, origin) : [];

  const updated = await store.write.updateRecord({
    id: row.id,
    form: parsed.data,
    now,
    ...(version === undefined ? {} : { version }),
    from: ['DRAFT', 'SUBMITTED', 'RETURNED'],
  });
  if (!updated) return conflict(c, 'This record changed on the server. Reload it and try again.');

  const keep = new Map(assigned.map((pic) => [pic.email, pic]));
  await store.write.replaceLists(
    row.id,
    parsed.data.sdgIds,
    parsed.data.pics.map((pic) => {
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

  const nowEmails = new Set(parsed.data.pics.map((pic) => pic.email.toLowerCase()));
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
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'RECORD_UPDATED',
    entityType: 'report',
    entityId: row.id,
    fromStatus: row.status,
    toStatus: updated.status,
    comment: row.referenceNo,
  });

  return c.json(toReportHead(updated));
});

reportRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  if (!canDeleteRecord(viewer, row.status)) {
    return forbidden(c, 'Only a record with no submitted narrative can be deleted.');
  }

  const attachments = await store.read.listAttachments(row.id);
  for (const attachment of attachments) {
    await c.env.BUCKET.delete(attachment.objectKey).catch(() => undefined);
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

  return c.body(null, 204);
});

reportRoutes.get('/:id', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  const isPic = await store.read.isPic(row.id, viewer.userId);
  if (!canViewReport(viewer, isPic)) return notFound(c);

  return c.json(await detailOf(c, row));
});

/* ---------- Narrative ---------- */

reportRoutes.put('/:id/narrative', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const store = stack(c);
  const row = await store.read.findById(c.req.param('id') ?? '');
  if (!row) return notFound(c);
  const isPic = await store.read.isPic(row.id, viewer.userId);
  if (!canWriteNarrative(viewer, isPic, row.status)) {
    return forbidden(c, 'This record is not open for a narrative edit.');
  }

  const parsed = reportNarrativeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c, parsed.error.issues);

  const version = versionFrom(c);
  if (version === null) return conflict(c, 'The record version is not valid.');

  const updated = await store.write.setNarrative({
    id: row.id,
    narrative: parsed.data.narrative,
    now: new Date().toISOString(),
    ...(version === undefined ? {} : { version }),
    from: ['DRAFT', 'RETURNED'],
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
  if (!isPic) return forbidden(c, 'Only the personnel in charge may submit this narrative.');

  const key = idempotencyKey(c);
  const fingerprint = key ? await requestFingerprint({ reportId: row.id }) : '';
  if (key) {
    const stored = await findStoredResponse(store.db, key, viewer.userId);
    if (stored) {
      if (stored.requestHash !== fingerprint) return idempotencyConflict(c);
      return c.json(JSON.parse(stored.response));
    }
  }

  if (row.status !== 'DRAFT' && row.status !== 'RETURNED') {
    return conflict(c, 'This narrative has already been submitted.');
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
        origin: new URL(c.req.url).origin,
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
  if (!parsed.success) return invalid(c, parsed.error.issues);
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

  if (!approving && parsed.data.comments) {
    const round = (await store.write.countReturns(row.id)) + 1;
    await store.write.insertComment({
      id: crypto.randomUUID(),
      reportId: row.id,
      authorUserId: viewer.userId,
      kind: 'RETURN',
      round,
      body: parsed.data.comments,
      createdAt: now,
    });
  }

  const pics = await store.read.listPics(row.id);
  const recipients = await picUsers(c, pics);
  const origin = new URL(c.req.url).origin;

  for (const [index, pic] of pics.entries()) {
    if (!pic.userId) continue;
    await notify(c.env, {
      userId: pic.userId,
      kind: approving ? 'APPROVED' : 'RETURNED',
      description: approving
        ? `${row.referenceNo} was approved`
        : `${row.referenceNo} was returned for revision`,
      ...(approving ? {} : { comment: parsed.data.comments ?? null }),
      target: { kind: 'report', reportId: row.id },
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
  const origin = new URL(c.req.url).origin;
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
  const isPic = await store.read.isPic(row.id, viewer.userId);
  if (!canViewReport(viewer, isPic)) return notFound(c);

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
  const isPic = await store.read.isPic(row.id, viewer.userId);
  if (!canViewReport(viewer, isPic)) return notFound(c);

  const receipt = await store.receipts.findById(c.req.param('receiptId') ?? '');
  if (!receipt || receipt.reportId !== row.id) return notFound(c);
  if (!isAdmin(viewer) && receipt.recipientUserId !== viewer.userId) return notFound(c);

  const object = await c.env.BUCKET.get(receipt.objectKey);
  let body: BodyInit | null = object ? (object.body as BodyInit) : null;

  // A render that failed at approval is repaired here, without re-sending mail.
  if (!body) {
    const pic = (await store.read.listPics(row.id)).find(
      (candidate) => candidate.id === receipt.recipientPicId,
    );
    if (!pic) return notFound(c);

    try {
      const bytes = await renderReceiptBytes(c.env, row, pic);
      await c.env.BUCKET.put(receipt.objectKey, bytes, {
        httpMetadata: { contentType: 'application/pdf' },
      });
      body = bytes as unknown as BodyInit;
    } catch {
      return notFound(c);
    }
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
  const isPic = await store.read.isPic(row.id, viewer.userId);
  if (!canViewReport(viewer, isPic)) return notFound(c);

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

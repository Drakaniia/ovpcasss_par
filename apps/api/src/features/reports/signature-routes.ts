import { reportSignatureSchema, type ReportDetail } from '@par/shared';
import type { Context, Hono } from 'hono';

import type { AppEnv } from '../../env';
import { parseSignatureImage, reportSignatureKey } from '../../lib/signature-image';
import { rateLimit } from '../../middleware/rate-limit';
import { buildReportDetail } from './application/report-detail';
import { reportDependencies, viewerOf } from './application/report-context';
import {
  canManageRecord,
  canViewReport,
  canWriteNarrative,
  isAdmin,
} from './domain/report-access';

/**
 * The submitter's signature on one report (signature spec §4.4). The report
 * keeps its own copy, written when the author signs and never rewritten from the
 * profile afterwards, so a signed report always prints the image it was signed
 * with. Only the owner may write, and only while the report is editable.
 */
export function registerReportSignatureRoutes(router: Hono<AppEnv>): void {
  router.put('/:id/signature', rateLimit({ limit: 30, windowSeconds: 60 }), async (c) => {
    const viewer = viewerOf(c);
    if (!viewer) return unauthorized(c);

    const stack = reportDependencies(c);
    const row = await stack.read.findById(c.req.param('id') ?? '');
    if (!row) return notFound(c);
    const isPic = await stack.read.isPic(row.id, viewer.userId);
    if (!canWriteNarrative(viewer, isPic, row.status)) {
      return forbidden(c);
    }

    const parsed = reportSignatureSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return invalid(c);

    if ('fromProfile' in parsed.data) {
      const user = await stack.users.findById(viewer.userId);
      if (!user?.signatureObjectKey) return noProfileSignature(c);

      const object = await c.env.BUCKET.get(user.signatureObjectKey);
      if (!object) return noProfileSignature(c);

      return storeSignature(
        c,
        row,
        stack,
        new Uint8Array(await object.arrayBuffer()),
        object.httpMetadata?.contentType ?? 'image/png',
      );
    }

    const image = parseSignatureImage(parsed.data.image);
    if (!image) return invalid(c);

    return storeSignature(c, row, stack, image.bytes, image.mimeType);
  });

  router.delete('/:id/signature', rateLimit({ limit: 30, windowSeconds: 60 }), async (c) => {
    const viewer = viewerOf(c);
    if (!viewer) return unauthorized(c);

    const stack = reportDependencies(c);
    const row = await stack.read.findById(c.req.param('id') ?? '');
    if (!row) return notFound(c);
    const isPic = await stack.read.isPic(row.id, viewer.userId);
    if (!canWriteNarrative(viewer, isPic, row.status)) return forbidden(c);

    if (row.narrativeSignatureKey) {
      await c.env.BUCKET.delete(row.narrativeSignatureKey).catch(() => undefined);
    }

    const cleared = await stack.write.setSignature(row.id, {
      key: null,
      signedAt: null,
      cleared: true,
      now: new Date().toISOString(),
    });
    if (!cleared) return notFound(c);

    return c.json(await detailFor(c, row.id));
  });

  /** Storage-free fallback for `wrangler dev`; viewers only. */
  router.get('/:id/signature/file', async (c) => {
    const row = await visibleReport(c);
    if (!row) return notFound(c);
    if (!row.narrativeSignatureKey) return notFound(c);

    return imageResponse(c, row.narrativeSignatureKey);
  });

  /**
   * The approving officer's image, as the facsimile's second slot shows it. The
   * record keeps its own copy from the moment of approval; a record approved
   * before that copy existed still shows the profile image.
   */
  router.get('/:id/approval-signature/file', async (c) => {
    const row = await visibleReport(c);
    if (!row) return notFound(c);
    if (!row.approvedByUserId) return notFound(c);

    const user = await reportDependencies(c).users.findById(row.approvedByUserId);

    return imageResponse(c, row.approvalSignatureKey, user?.signatureObjectKey ?? null);
  });
}

/**
 * Writes the report's own copy, points the row at it, then drops the previous
 * object. No separate audit event: the submission (or resubmission) already
 * records the transition (signature spec §4.4).
 */
async function storeSignature(
  c: Context<AppEnv>,
  row: { id: string; narrativeSignatureKey: string | null },
  stack: ReturnType<typeof reportDependencies>,
  bytes: Uint8Array,
  mimeType: string,
): Promise<Response> {
  const key = reportSignatureKey(row.id);
  await c.env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mimeType } });

  const now = new Date().toISOString();
  const updated = await stack.write.setSignature(row.id, { key, signedAt: now, cleared: false, now });
  if (!updated) return notFound(c);

  if (row.narrativeSignatureKey) {
    await c.env.BUCKET.delete(row.narrativeSignatureKey).catch(() => undefined);
  }

  return c.json(await detailFor(c, row.id));
}

async function detailFor(c: Context<AppEnv>, reportId: string): Promise<ReportDetail> {
  const stack = reportDependencies(c);
  const viewer = viewerOf(c);
  const row = await stack.read.findById(reportId);
  if (!row || !viewer) throw new Error('The report disappeared while its signature was saved');

  const isPic = await stack.read.isPic(row.id, viewer.userId);
  return buildReportDetail(c.env, row, {
    canWriteNarrative: canWriteNarrative(viewer, isPic, row.status),
    canManage: canManageRecord(viewer, row.status),
    ...(isAdmin(viewer) ? {} : { receiptsForUserId: viewer.userId }),
  });
}

async function visibleReport(c: Context<AppEnv>) {
  const viewer = viewerOf(c);
  if (!viewer) return null;

  const deps = reportDependencies(c);
  const row = await deps.read.findById(c.req.param('id') ?? '');
  if (!row) return null;
  const isPic = await deps.read.isPic(row.id, viewer.userId);
  return canViewReport(viewer, isPic) ? row : null;
}

/** The first key that still holds an object; a broken one falls through. */
async function imageResponse(
  c: Context<AppEnv>,
  ...keys: (string | null | undefined)[]
): Promise<Response> {
  for (const key of keys) {
    if (!key) continue;

    const object = await c.env.BUCKET.get(key);
    if (!object) continue;

    return new Response(object.body as BodyInit, {
      status: 200,
      headers: {
        'content-type': object.httpMetadata?.contentType ?? 'image/png',
        'cache-control': 'private, no-store',
      },
    });
  }

  return notFound(c);
}

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
}

function forbidden(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'FORBIDDEN', message: 'This report is not open for edits.' } },
    403,
  );
}

function invalid(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'INVALID_SIGNATURE', message: 'Use a PNG or JPEG image under 2 MB.' } },
    400,
  );
}

function noProfileSignature(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: 'SIGNATURE_NOT_ON_FILE',
        message: 'Add a signature on your profile first.',
      },
    },
    409,
  );
}

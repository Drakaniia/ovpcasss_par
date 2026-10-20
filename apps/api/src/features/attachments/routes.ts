import {
  confirmAttachmentInputSchema,
  presignRequestSchema,
  type AttachmentStatus,
} from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { signedDownloadUrl } from '../../lib/download-url';
import { toHex } from '../../lib/encoding';
import { requireSession } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { canEditReport, canViewReport } from '../reports/domain/report-access';
import { toAttachment } from '../reports/application/report-shape';
import {
  attachmentObjectKey,
  reportDependencies,
  viewerOf,
} from '../reports/application/workflow-context';
import {
  attachmentSizeProblem,
  isAllowedAttachment,
  storedTypeAllowed,
} from './domain/attachment-rules';
import { PresignUnavailableError, presignPut } from './infrastructure/r2-presign';

/**
 * Attachments (spec §7.8). The API mints a presigned PUT (or takes the body
 * itself when storage signing is not configured), records a PENDING row,
 * verifies the object at confirm, and serves downloads through itself so the
 * bucket is never public and the object key never reaches the page.
 */
export const attachmentRoutes = new Hono<AppEnv>();

attachmentRoutes.use('*', requireSession);

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to manage attachments' } }, 401);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'This attachment does not exist' } }, 404);
}

function conflict(c: Context<AppEnv>, code: string, message: string) {
  return c.json({ error: { code, message } }, 409);
}

function invalid(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'VALIDATION_ERROR', message } }, 400);
}

function editable(status: AttachmentStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

attachmentRoutes.post(
  '/:id/attachments/presign',
  rateLimit({ limit: 30, windowSeconds: 60 }),
  async (c) => {
    const viewer = viewerOf(c);
    if (!viewer) return unauthorized(c);

    const stack = reportDependencies(c);
    const report = await stack.read.findById(c.req.param('id') ?? '');
    if (!report) return notFound(c);
    if (!canEditReport(viewer, report.ownerUserId, report.status)) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'This report cannot accept new files.' } },
        403,
      );
    }

    const parsed = presignRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return invalid(c, 'The file details are not valid.');

    const sizeProblem = attachmentSizeProblem(parsed.data.size);
    if (sizeProblem) return invalid(c, sizeProblem);
    if (!isAllowedAttachment(parsed.data.fileName, parsed.data.mimeType)) {
      return invalid(c, 'That file type is not accepted. Upload a PDF, image, or Office document.');
    }

    const key = attachmentObjectKey(report.id);
    const id = crypto.randomUUID();

    let upload: { uploadUrl: string; headers: Record<string, string>; mode: 'presigned' | 'proxy' };
    try {
      const presigned = await presignPut(c.env, key, { mimeType: parsed.data.mimeType });
      upload = { ...presigned, mode: 'presigned' };
    } catch (error) {
      if (!(error instanceof PresignUnavailableError)) throw error;
      // No R2 API token (local development): the Worker stores the bytes itself.
      upload = {
        uploadUrl: uploadContentUrl(c, report.id, id),
        headers: { 'content-type': parsed.data.mimeType },
        mode: 'proxy',
      };
    }

    const attachment = await stack.attachments.insertPending({
      id,
      reportId: report.id,
      originalName: parsed.data.fileName,
      objectKey: key,
      size: parsed.data.size,
      mimeType: parsed.data.mimeType,
      uploadedByUserId: viewer.userId,
      now: new Date().toISOString(),
    });

    return c.json({
      attachmentId: attachment.id,
      uploadUrl: upload.uploadUrl,
      method: 'PUT' as const,
      mode: upload.mode,
      headers: upload.headers,
    });
  },
);

/**
 * The storage fallback: the same PUT the presigned URL would accept, handled by
 * the Worker so `wrangler dev` works without R2 S3 credentials. Same-origin, so
 * the session cookie authenticates it (spec §7.8 keeps the bucket private).
 */
attachmentRoutes.put(
  '/:id/attachments/:attachmentId/content',
  rateLimit({ limit: 30, windowSeconds: 60 }),
  async (c) => {
    const viewer = viewerOf(c);
    if (!viewer) return unauthorized(c);

    const stack = reportDependencies(c);
    const report = await stack.read.findById(c.req.param('id') ?? '');
    if (!report) return notFound(c);
    if (!canEditReport(viewer, report.ownerUserId, report.status)) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'This report cannot accept new files.' } },
        403,
      );
    }

    const attachment = await stack.attachments.findById(
      report.id,
      c.req.param('attachmentId') ?? '',
    );
    if (!attachment || attachment.status !== 'PENDING') return notFound(c);

    const body = c.req.raw.body;
    if (!body) return invalid(c, 'The upload was empty.');

    const length = Number(c.req.header('content-length') ?? '0');
    const sizeProblem = attachmentSizeProblem(length);
    if (sizeProblem) return invalid(c, sizeProblem);

    await c.env.BUCKET.put(attachment.objectKey, body, {
      httpMetadata: { contentType: attachment.mimeType },
    });

    // The confirmed size is what confirm re-checks; a trimmed body is refused
    // there, and the object is dropped here so nothing half-written remains.
    const stored = await c.env.BUCKET.head(attachment.objectKey);
    if (!stored || stored.size !== attachment.size) {
      await c.env.BUCKET.delete(attachment.objectKey).catch(() => undefined);
      return conflict(
        c,
        'UPLOAD_SIZE_MISMATCH',
        'The uploaded file did not match the declared size.',
      );
    }

    return c.body(null, 204);
  },
);

function uploadContentUrl(c: Context<AppEnv>, reportId: string, attachmentId: string): string {
  return new URL(
    `/api/v1/reports/${reportId}/attachments/${attachmentId}/content`,
    c.req.url,
  ).toString();
}

attachmentRoutes.post('/:id/attachments/:attachmentId/confirm', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const report = await stack.read.findById(c.req.param('id') ?? '');
  if (!report) return notFound(c);
  if (!canEditReport(viewer, report.ownerUserId, report.status)) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'This report is not open for edits.' } },
      403,
    );
  }

  const parsed = confirmAttachmentInputSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return invalid(c, 'The label is not valid.');

  const attachment = await stack.attachments.findById(report.id, c.req.param('attachmentId') ?? '');
  if (!attachment || !editable(attachment.status)) return notFound(c);

  const now = new Date().toISOString();

  // A confirmed upload can be renamed without touching the stored object.
  if (attachment.status === 'CONFIRMED') {
    const renamed =
      parsed.data.label === undefined
        ? attachment
        : await stack.attachments.rename(attachment.id, parsed.data.label, now);

    return c.json({ attachment: toAttachment(renamed ?? attachment) });
  }

  const object = await c.env.BUCKET.head(attachment.objectKey);
  if (!object) {
    return conflict(c, 'UPLOAD_NOT_FOUND', 'The file was not found in storage. Upload it again.');
  }
  if (object.size !== attachment.size) {
    return conflict(
      c,
      'UPLOAD_SIZE_MISMATCH',
      'The uploaded file did not match the declared size.',
    );
  }
  if (!storedTypeAllowed(object.httpMetadata?.contentType)) {
    return conflict(
      c,
      'UPLOAD_TYPE_NOT_ALLOWED',
      'That file type is not accepted. Upload a PDF, image, or Office document.',
    );
  }

  const body = await c.env.BUCKET.get(attachment.objectKey);
  const digest = body
    ? toHex(await crypto.subtle.digest('SHA-256', await body.arrayBuffer()))
    : null;

  const confirmed = await stack.attachments.confirm(attachment.id, {
    ...(parsed.data.label === undefined ? {} : { label: parsed.data.label }),
    sha256: digest,
    now,
  });

  if (!confirmed) {
    return conflict(c, 'UPLOAD_STATE_CHANGED', 'The upload changed while it was confirmed.');
  }

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'ATTACHMENT_ADDED',
    entityType: 'attachment',
    entityId: confirmed.id,
    comment: `${confirmed.originalName} on report ${report.id}`,
  });

  return c.json({ attachment: toAttachment(confirmed) });
});

attachmentRoutes.get('/:id/attachments/:attachmentId/url', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const report = await stack.read.findById(c.req.param('id') ?? '');
  if (!report || !canViewReport(viewer, report.ownerUserId)) return notFound(c);

  const attachment = await stack.attachments.findById(report.id, c.req.param('attachmentId') ?? '');
  if (!attachment || attachment.status !== 'CONFIRMED') return notFound(c);

  const url = await signedDownloadUrl(
    c,
    attachment.objectKey,
    `/api/v1/reports/${report.id}/attachments/${attachment.id}/file`,
  );

  return c.json({
    url,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
});

attachmentRoutes.get('/:id/attachments/:attachmentId/file', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const report = await stack.read.findById(c.req.param('id') ?? '');
  if (!report || !canViewReport(viewer, report.ownerUserId)) return notFound(c);

  const attachment = await stack.attachments.findById(report.id, c.req.param('attachmentId') ?? '');
  if (!attachment || attachment.status !== 'CONFIRMED') return notFound(c);

  const object = await c.env.BUCKET.get(attachment.objectKey);
  if (!object) return notFound(c);

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'EXPORTED',
    entityType: 'attachment',
    entityId: attachment.id,
    comment: `${attachment.originalName} on report ${report.id}`,
  });

  return new Response(object.body as BodyInit, {
    status: 200,
    headers: {
      'content-type': object.httpMetadata?.contentType ?? attachment.mimeType,
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
      'cache-control': 'private, no-store',
    },
  });
});

attachmentRoutes.delete('/:id/attachments/:attachmentId', async (c) => {
  const viewer = viewerOf(c);
  if (!viewer) return unauthorized(c);

  const stack = reportDependencies(c);
  const report = await stack.read.findById(c.req.param('id') ?? '');
  if (!report) return notFound(c);
  if (!canEditReport(viewer, report.ownerUserId, report.status)) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'This report is not open for edits.' } },
      403,
    );
  }

  const attachment = await stack.attachments.findById(report.id, c.req.param('attachmentId') ?? '');
  if (!attachment || attachment.status === 'DELETED') return notFound(c);

  await stack.attachments.softDelete(attachment.id, new Date().toISOString());
  await c.env.BUCKET.delete(attachment.objectKey).catch(() => undefined);

  await recordAudit(c, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'ATTACHMENT_REMOVED',
    entityType: 'attachment',
    entityId: attachment.id,
    comment: `${attachment.originalName} on report ${report.id}`,
  });

  return c.body(null, 204);
});

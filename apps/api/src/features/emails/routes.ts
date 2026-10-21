import { createDb, createEmailOutboxQueries, createRateLimitQueries } from '@par/db';
import {
  EMAIL_KINDS,
  emailLogQuerySchema,
  type EmailKind,
  type EmailLogResponse,
} from '@par/shared';
import { Hono, type Context } from 'hono';

import { enqueueEmail, readPayload, readStoredMessage } from '../../email/outbox';
import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';

/** Ten resends an hour per admin (email spec §9.4). */
const RESEND_LIMIT = 10;

/**
 * The administrator's mail log (email spec §9.4, phase 17). It is history, not a
 * queue: a table over `email_outbox` with one action, resend. Only an
 * administrator reaches it.
 */
export const emailLogRoutes = new Hono<AppEnv>();

emailLogRoutes.use('*', requireSession);

const adminOnly = requireRole('ADMIN');

function queries(c: Context<AppEnv>) {
  return createEmailOutboxQueries(createDb(c.env.DB));
}

function kindOf(value: string): EmailKind {
  return EMAIL_KINDS.includes(value as EmailKind) ? (value as EmailKind) : 'SUBMITTED';
}

emailLogRoutes.get('/', adminOnly, async (c) => {
  const parsed = emailLogQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'That filter is not supported' } },
      400,
    );
  }

  const outbox = queries(c);
  const [page, failed, suppressed] = await Promise.all([
    outbox.list({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.to ? { to: parsed.data.to } : {}),
      page: parsed.data.page,
      size: parsed.data.size,
    }),
    outbox.countByStatus('FAILED'),
    outbox.countByStatus('SUPPRESSED'),
  ]);

  const response: EmailLogResponse = {
    items: page.rows.map((row) => {
      const payload = readPayload(row.payload);
      return {
        id: row.id,
        kind: kindOf(row.kind),
        to: row.to,
        subject: payload?.subject ?? '',
        status: row.status,
        attempts: row.attempts,
        lastError: row.lastError,
        reportId: payload?.reportId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        canResend: row.status === 'FAILED' || row.status === 'SUPPRESSED',
      };
    }),
    total: page.total,
    page: parsed.data.page,
    size: parsed.data.size,
    counts: { failed, suppressed },
  };

  return c.json(response);
});

emailLogRoutes.post('/:id/resend', adminOnly, async (c) => {
  const adminId = c.get('userId');
  if (!adminId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const outbox = queries(c);
  const row = await outbox.findById(c.req.param('id') ?? '');
  if (!row) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'This message does not exist' } }, 404);
  }
  if (row.status !== 'FAILED' && row.status !== 'SUPPRESSED') {
    return c.json(
      {
        error: {
          code: 'EMAIL_NOT_RESENDABLE',
          message: 'Only a failed or suppressed message can be sent again.',
        },
      },
      409,
    );
  }

  const windowStart = `${new Date().toISOString().slice(0, 13)}:00:00.000Z`;
  const used = await createRateLimitQueries(createDb(c.env.DB)).consume(
    `email-resend:${adminId}`,
    windowStart,
  );
  if (used > RESEND_LIMIT) {
    return c.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Ten resends an hour is the limit. Try again later.',
        },
      },
      429,
    );
  }

  const payload = readPayload(row.payload);
  const message = payload?.messageKey ? await readStoredMessage(c.env, payload.messageKey) : null;

  if (!payload || !message) {
    return c.json(
      {
        error: {
          code: 'EMAIL_RESEND_UNAVAILABLE',
          message: 'The stored message is no longer available. Repeat the action instead.',
        },
      },
      409,
    );
  }

  const id = await enqueueEmail(c.env, {
    kind: kindOf(row.kind),
    to: row.to,
    content: message,
    attachments: payload.attachments,
    reportId: payload.reportId,
    ...(payload.note ? { note: payload.note } : {}),
  });

  await recordAudit(c, {
    actorUserId: adminId,
    actorRole: 'ADMIN',
    action: 'EMAIL_RESENT',
    entityType: 'email',
    entityId: id,
    comment: `Resent the ${row.kind} message to ${row.to}, original ${row.id}`,
  });

  return c.json({ id }, 202);
});

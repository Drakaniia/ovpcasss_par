import { createDb, createEmailOutboxQueries } from '@par/db';
import type { EmailAttachmentRef } from '@par/email';

import type { Env } from '../env';
import { loadAttachments } from './attachments';
import { createEmailProvider } from './provider';

/** `wrangler.toml` sets `max_retries = 5`; the last attempt is the fifth. */
export const EMAIL_MAX_ATTEMPTS = 5;

/**
 * A queued message carries references, not bytes (email spec §7.1): Cloudflare
 * Queues caps a message at 128 KB and every one of our documents is larger.
 */
export interface EmailJob {
  outboxId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: readonly EmailAttachmentRef[];
}

/** A message this Worker did not write is not worth retrying five times. */
function isEmailJob(body: unknown): body is EmailJob {
  if (typeof body !== 'object' || body === null) return false;

  const candidate = body as Record<string, unknown>;
  return (['outboxId', 'to', 'subject', 'html', 'text'] as const).every(
    (field) => typeof candidate[field] === 'string' && candidate[field] !== '',
  );
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}

/**
 * Outbound email consumer (spec §7.9, email spec §9.2). Retries with backoff and
 * the dead-letter queue are `wrangler.toml` configuration. The outbox row is
 * written before the job is sent and updated here, so a message that ends up in
 * the DLQ already has a visible `FAILED` row with its last error.
 */
export async function emailQueueHandler(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  const provider = createEmailProvider(env);
  const outbox = createEmailOutboxQueries(createDb(env.DB));

  for (const message of batch.messages) {
    if (!isEmailJob(message.body)) {
      console.error(
        JSON.stringify({ level: 'error', message: 'Queued message is not an email job' }),
      );
      message.ack();
      continue;
    }

    const job = message.body;
    const attempts = message.attempts;

    try {
      const attachments = await loadAttachments(env, job.attachments);

      await provider.send({
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
        ...(attachments.length > 0 ? { attachments } : {}),
        idempotencyKey: job.outboxId,
      });

      await outbox.markSent(job.outboxId, new Date().toISOString()).catch(() => undefined);
      message.ack();
    } catch (error) {
      const reason = reasonOf(error);

      if (attempts >= EMAIL_MAX_ATTEMPTS) {
        await outbox
          .markFailed(job.outboxId, reason, attempts, new Date().toISOString())
          .catch(() => undefined);
      }

      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Queued email could not be sent',
          kind: job.outboxId,
          attempts,
          reason,
        }),
      );
      message.retry();
    }
  }
}

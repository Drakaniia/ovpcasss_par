import type { EmailMessage } from '@par/email';

import type { Env } from '../env';
import { createEmailProvider } from './provider';

/** A queued message is the composed email itself; the queue only delivers it. */
export type EmailJob = EmailMessage;

export async function enqueueEmail(env: Env, job: EmailJob): Promise<void> {
  await env.EMAIL_QUEUE.send(job);
}

/** A message this Worker did not write is not worth retrying five times. */
function isEmailJob(body: unknown): body is EmailJob {
  if (typeof body !== 'object' || body === null) return false;

  const candidate = body as Record<string, unknown>;
  return (['to', 'subject', 'html', 'text'] as const).every(
    (field) => typeof candidate[field] === 'string' && candidate[field] !== '',
  );
}

/**
 * Outbound email consumer (spec §7.9). Retries with backoff and the dead-letter
 * queue are `wrangler.toml` configuration. A send that keeps failing never
 * reaches a workflow: the notification row was written before the mail was
 * queued, so the inbox stays correct.
 */
export async function emailQueueHandler(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  const provider = createEmailProvider(env);

  for (const message of batch.messages) {
    if (!isEmailJob(message.body)) {
      console.error(
        JSON.stringify({ level: 'error', message: 'Queued message is not an email job' }),
      );
      message.ack();
      continue;
    }

    try {
      await provider.send(message.body);
      message.ack();
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Queued email could not be sent',
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
      message.retry();
    }
  }
}

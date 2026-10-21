import { createDb, createEmailOutboxQueries } from '@par/db';
import type { EmailAttachmentRef, EmailContent, EmailKind } from '@par/email';

import type { Env } from '../env';

/**
 * What an outbox row keeps (email spec D22): enough to list the message and to
 * re-send it, never the rendered body. `subject` is the one human-readable field,
 * so the log needs no second source.
 */
export interface OutboxPayload {
  subject: string;
  reportId: string | null;
  attachments: readonly EmailAttachmentRef[];
  note?: string;
  /**
   * The rendered body, stored in R2 rather than D1 (email spec D19/D22). The row
   * keeps a reference; a resend re-sends exactly what the recipient would have
   * received instead of re-deriving it from later state.
   */
  messageKey?: string;
}

/** What a stored message carries; the recipient is already on the row. */
export interface StoredMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function messageKeyFor(outboxId: string): string {
  return `emails/${outboxId}.json`;
}

async function storeMessage(
  env: Env,
  outboxId: string,
  message: StoredMessage,
): Promise<string | null> {
  try {
    const key = messageKeyFor(outboxId);
    await env.BUCKET.put(key, JSON.stringify(message), {
      httpMetadata: { contentType: 'application/json' },
    });
    return key;
  } catch (error) {
    // Mail still goes out; only an admin resend loses its exact copy.
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Rendered message could not be stored',
        reason: reasonOf(error),
      }),
    );
    return null;
  }
}

export async function readStoredMessage(env: Env, key: string): Promise<StoredMessage | null> {
  const object = await env.BUCKET.get(key);
  if (!object) return null;

  try {
    return JSON.parse(await object.text()) as StoredMessage;
  } catch {
    return null;
  }
}

export interface OutboxMessage {
  kind: EmailKind;
  to: string;
  content: EmailContent;
  attachments?: readonly EmailAttachmentRef[];
  reportId?: string | null;
  note?: string;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}

function payloadOf(message: OutboxMessage, subject: string, messageKey: string | null): string {
  const payload: OutboxPayload = {
    subject,
    reportId: message.reportId ?? null,
    attachments: message.attachments ?? [],
    ...(message.note ? { note: message.note } : {}),
    ...(messageKey ? { messageKey } : {}),
  };
  return JSON.stringify(payload);
}

export function readPayload(raw: string): OutboxPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<OutboxPayload>;
    return {
      subject: typeof parsed.subject === 'string' ? parsed.subject : '',
      reportId: typeof parsed.reportId === 'string' ? parsed.reportId : null,
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      ...(typeof parsed.note === 'string' ? { note: parsed.note } : {}),
      ...(typeof parsed.messageKey === 'string' ? { messageKey: parsed.messageKey } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * The single funnel for outbound mail (email spec §9.1): one row `QUEUED`, then
 * the queue job. A queue failure marks the row `FAILED` and is logged, never
 * thrown — a workflow transition must not fail because mail could not be queued.
 */
export async function enqueueEmail(env: Env, message: OutboxMessage): Promise<string> {
  const queries = createEmailOutboxQueries(createDb(env.DB));
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const messageKey = await storeMessage(env, id, {
    to: message.to,
    subject: message.content.subject,
    html: message.content.html,
    text: message.content.text,
  });

  await queries.insert({
    id,
    kind: message.kind,
    to: message.to,
    payload: payloadOf(message, message.content.subject, messageKey),
    status: 'QUEUED',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await env.EMAIL_QUEUE.send({
      outboxId: id,
      to: message.to,
      subject: message.content.subject,
      html: message.content.html,
      text: message.content.text,
      ...(message.attachments && message.attachments.length > 0
        ? { attachments: message.attachments }
        : {}),
    });
  } catch (error) {
    await queries
      .markFailed(id, reasonOf(error), 0, new Date().toISOString())
      .catch(() => undefined);
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Email could not be queued',
        kind: message.kind,
        reason: reasonOf(error),
      }),
    );
  }

  return id;
}

/**
 * Records a message that was deliberately not sent, so the reason is visible in
 * the admin log instead of disappearing (email spec §5.4, §9.2). No queue job.
 */
export async function suppressEmail(
  env: Env,
  input: {
    kind: EmailKind;
    to: string;
    reason: string;
    reportId?: string | null;
    subject?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();

  try {
    await createEmailOutboxQueries(createDb(env.DB)).insert({
      id: crypto.randomUUID(),
      kind: input.kind,
      to: input.to,
      payload: JSON.stringify({
        subject: input.subject ?? '',
        reportId: input.reportId ?? null,
        attachments: [],
        note: input.reason,
      } satisfies OutboxPayload),
      status: 'SUPPRESSED',
      attempts: 0,
      lastError: input.reason,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Suppressed mail could not be recorded',
        kind: input.kind,
        reason: reasonOf(error),
      }),
    );
  }
}

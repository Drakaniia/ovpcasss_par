import type { EmailKind } from '@par/shared';

export type { EmailKind };

/** Bytes only exist in the Worker and the consumer; never in a queue job. */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Uint8Array;
}

/**
 * A queue job and an outbox row carry references, not bytes: Cloudflare Queues
 * caps a message at 128 KB (email spec §7.1).
 */
export interface EmailAttachmentRef {
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  attachments?: readonly EmailAttachment[];
}

export interface EmailMessage extends EmailContent {
  to: string;
  /** Resend idempotency header, derived from the outbox id. */
  idempotencyKey?: string;
}

/** Adapter port for the outbound queue worker (spec §7.9). Chosen by env var. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export type EmailProviderKind = 'brevo' | 'resend' | 'cloudflare' | 'console';

import type { EmailAttachment, EmailAttachmentRef } from '@par/email';

import type { Env } from '../env';

/** Under Resend's limit and far under Cloudflare Email Service's own cap. */
export const DEFAULT_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function maxAttachmentBytes(env: Env): number {
  const parsed = Number(env.EMAIL_MAX_ATTACHMENT_BYTES);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ATTACHMENT_BYTES;
}

export interface BudgetedAttachments {
  refs: readonly EmailAttachmentRef[];
  /** True when the document was dropped because it exceeded the cap. */
  omitted: boolean;
}

/**
 * Mail is never withheld because a document is large (email spec §7.3): the
 * attachment is dropped, the copy points at the app instead, and the outbox row
 * records the omission.
 */
export function applyAttachmentBudget(
  refs: readonly EmailAttachmentRef[],
  max = DEFAULT_MAX_ATTACHMENT_BYTES,
): BudgetedAttachments {
  const total = refs.reduce((sum, ref) => sum + Math.max(0, ref.size), 0);
  return total > max ? { refs: [], omitted: refs.length > 0 } : { refs, omitted: false };
}

/**
 * The consumer reads the bytes: a queue message carries references only
 * (email spec §7.1). A missing object throws, so the message is retried rather
 * than delivered without the document it promises.
 */
export async function loadAttachments(
  env: Env,
  refs: readonly EmailAttachmentRef[] | undefined,
): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = [];

  for (const ref of refs ?? []) {
    const object = await env.BUCKET.get(ref.objectKey);
    if (!object) {
      throw new Error(`Attachment "${ref.filename}" is missing from storage`);
    }

    attachments.push({
      filename: ref.filename,
      contentType: ref.contentType,
      content: new Uint8Array(await object.arrayBuffer()),
    });
  }

  return attachments;
}

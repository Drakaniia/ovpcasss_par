import type { EmailMessage, EmailProvider } from '../provider';
import { toBase64 } from './base64';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface ResendOptions {
  /**
   * Replies are routed here, so the sending address is never read. The office
   * mailbox stays reachable even while the sender sits on a test address.
   */
  replyTo?: string | undefined;
}

/**
 * Resend adapter (spec §7.9, email spec §7.5). The API key is the Worker secret
 * `EMAIL_API_KEY` and `from` is the verified sender in `EMAIL_FROM`; both are
 * read in the queue consumer, never in the browser bundle.
 */
export function createResendProvider(
  apiKey: string,
  from: string,
  options: ResendOptions = {},
): EmailProvider {
  const replyTo = options.replyTo?.trim();

  return {
    async send(message: EmailMessage): Promise<void> {
      const attachments = message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: toBase64(attachment.content),
        content_type: attachment.contentType,
      }));

      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
          ...(message.idempotencyKey
            ? { headers: { 'Idempotency-Key': message.idempotencyKey } }
            : {}),
        }),
      });

      if (!response.ok) {
        // The body names the cause (unverified domain, bad key); keep the reason
        // on the error so the queue's last_error is actionable.
        const detail = await response.text().catch(() => '');
        throw new Error(
          `Resend rejected the message (${response.status}): ${detail.slice(0, 300)}`,
        );
      }
    },
  };
}

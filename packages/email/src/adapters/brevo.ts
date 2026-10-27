import type { EmailMessage, EmailProvider } from '../provider';
import { toBase64 } from './base64';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** `OVPCASSS PAR <addr>` becomes the two fields Brevo's API wants. */
function parseSender(from: string): { name?: string | undefined; email: string } {
  const match = /^(.*?)<([^>]+)>$/.exec(from.trim());

  if (!match) {
    return { email: from.trim() };
  }

  const name = match[1]?.trim();
  return { name: name || undefined, email: match[2]!.trim() };
}

export interface BrevoOptions {
  /** Replies are routed here, so the sending address is never read. */
  replyTo?: string | undefined;
}

/**
 * Brevo adapter. Brevo verifies a single sender address instead of a domain, so
 * `EMAIL_FROM` needs a mailbox confirmed in its dashboard and no DNS records:
 * mail reaches every real recipient while `send.buksu.edu.ph` waits on the
 * university (runbook `email-delivery.md`). The API key is the Worker secret
 * `EMAIL_API_KEY`; it never leaves the Worker.
 *
 * Brevo caps a message at 10 MB including the base64 expansion, which the
 * 8 MiB `EMAIL_MAX_ATTACHMENT_BYTES` budget stays under for the receipt PDFs.
 * `idempotencyKey` is not forwarded: Brevo has no idempotency header, and the
 * outbox row already deduplicates a retry.
 */
export function createBrevoProvider(
  apiKey: string,
  from: string,
  options: BrevoOptions = {},
): EmailProvider {
  const sender = parseSender(from);
  const replyTo = options.replyTo?.trim();

  return {
    async send(message: EmailMessage): Promise<void> {
      const attachments = message.attachments?.map((attachment) => ({
        name: attachment.filename,
        content: toBase64(attachment.content),
      }));

      const response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
          ...(replyTo ? { replyTo: { email: replyTo } } : {}),
          ...(attachments && attachments.length > 0 ? { attachment: attachments } : {}),
        }),
      });

      if (!response.ok) {
        // Brevo names the cause (unverified sender, bad key); keep the reason on
        // the error so the queue's last_error is actionable.
        const detail = await response.text().catch(() => '');
        throw new Error(
          `Brevo rejected the message (${response.status}): ${detail.slice(0, 300)}`,
        );
      }
    },
  };
}

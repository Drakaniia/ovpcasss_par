import {
  logoUrl,
  manilaDateTime,
  renderShell,
  type EmailContent,
  type EmailProviderKind,
} from '@par/email';

import type { Env } from '../env';
import { createEmailProvider } from './provider';

/**
 * The test message the variables page sends (email spec §9.6). It names the one
 * recipient and the time, and says plainly that nothing else happened, because
 * an administrator sees it in a mailbox, not in the app.
 */
export function testEmailContent(to: string, at: Date, origin?: string): EmailContent {
  return renderShell({
    subject: 'Test message from the OVPCASSS sending address',
    heading: 'This message confirms the sending address can deliver mail.',
    intro: [
      `It was sent to ${to} from the email variables page. If it arrived, the sending address and provider key in use are working.`,
      'No report, receipt, or account notice was created by this test.',
    ],
    facts: [
      { label: 'Recipient', value: to },
      { label: 'Sent', value: manilaDateTime(at) },
    ],
    ...(origin
      ? {
          action: {
            label: 'Open the email variables',
            url: `${origin}/admin/emails?tab=variables`,
          },
        }
      : {}),
    note: 'This message was requested by an administrator.',
    logoUrl: logoUrl(origin),
  });
}

/**
 * Sends one test directly through the provider, not the queue, for the same
 * reason the failure digest does: the answer is needed now, and Queues are
 * unsupported under `wrangler dev --remote`, so a queued test would report
 * `FAILED` on a perfectly good key. Nothing is written to the outbox, so a test
 * never appears in the office's mail log.
 */
export async function sendTestEmail(
  env: Env,
  to: string,
  at: Date = new Date(),
): Promise<{ provider: EmailProviderKind }> {
  const provider = await createEmailProvider(env);

  await provider.send({
    to,
    ...testEmailContent(to, at, env.APP_ORIGIN),
    idempotencyKey: `email-test-${at.getTime()}`,
  });

  return { provider: env.EMAIL_PROVIDER };
}

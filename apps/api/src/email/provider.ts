import type { EmailProvider } from '@par/email';
import {
  createBrevoProvider,
  createCloudflareEmailProvider,
  createConsoleProvider,
  createResendProvider,
} from '@par/email';

import type { Env } from '../env';
import { emailSenderFor } from './sender';

/**
 * Picks the adapter from `EMAIL_PROVIDER` (spec §7.9). The sender and key are
 * the administrator's saved row when there is one, and the Worker's
 * `EMAIL_FROM` / `EMAIL_API_KEY` otherwise (`sender.ts`). Neither leaves the
 * Worker, and the Tauri bundle never sees them.
 *
 * Brevo is the interim provider: it verifies one sender address rather than a
 * domain, so a message reaches its real recipient while `send.buksu.edu.ph`
 * waits on university DNS (runbook `email-delivery.md`). Every message goes to
 * the address on its own outbox row — nothing is redirected.
 */
export async function createEmailProvider(env: Env): Promise<EmailProvider> {
  const replyTo = env.EMAIL_REPLY_TO || undefined;

  // The console adapter prints and sends nothing, so it needs no key or DB read.
  if (env.EMAIL_PROVIDER === 'console') {
    return createConsoleProvider();
  }

  const sender = await emailSenderFor(env);

  if (env.EMAIL_PROVIDER === 'brevo') {
    return createBrevoProvider(sender.apiKey, sender.from, { replyTo });
  }

  if (env.EMAIL_PROVIDER === 'cloudflare') {
    return createCloudflareEmailProvider(sender.apiKey);
  }

  return createResendProvider(sender.apiKey, sender.from, { replyTo });
}

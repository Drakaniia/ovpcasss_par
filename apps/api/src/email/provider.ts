import type { EmailProvider } from '@par/email';
import {
  createBrevoProvider,
  createCloudflareEmailProvider,
  createConsoleProvider,
  createResendProvider,
} from '@par/email';

import type { Env } from '../env';

/**
 * Picks the adapter from `EMAIL_PROVIDER` (spec §7.9). The key is the Worker
 * secret `EMAIL_API_KEY` and the sender is `EMAIL_FROM`; neither leaves the
 * Worker, and the Tauri bundle never sees them.
 *
 * Brevo is the interim provider: it verifies one sender address rather than a
 * domain, so a message reaches its real recipient while `send.buksu.edu.ph`
 * waits on university DNS (runbook `email-delivery.md`). Every message goes to
 * the address on its own outbox row — nothing is redirected.
 */
export function createEmailProvider(env: Env): EmailProvider {
  const replyTo = env.EMAIL_REPLY_TO || undefined;

  if (env.EMAIL_PROVIDER === 'brevo') {
    return createBrevoProvider(env.EMAIL_API_KEY, env.EMAIL_FROM, { replyTo });
  }

  if (env.EMAIL_PROVIDER === 'cloudflare') {
    return createCloudflareEmailProvider(env.EMAIL_API_KEY);
  }

  if (env.EMAIL_PROVIDER === 'console') {
    return createConsoleProvider();
  }

  return createResendProvider(env.EMAIL_API_KEY, env.EMAIL_FROM, { replyTo });
}

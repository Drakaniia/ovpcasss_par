import type { EmailProvider } from '@par/email';
import {
  createCloudflareEmailProvider,
  createConsoleProvider,
  createResendProvider,
} from '@par/email';

import type { Env } from '../env';

/**
 * Picks the adapter from `EMAIL_PROVIDER` (spec §7.9). The key is the Worker
 * secret `EMAIL_API_KEY` and the sender is `EMAIL_FROM`; neither leaves the
 * Worker, and the Tauri bundle never sees them.
 */
export function createEmailProvider(env: Env): EmailProvider {
  if (env.EMAIL_PROVIDER === 'cloudflare') {
    return createCloudflareEmailProvider(env.EMAIL_API_KEY);
  }

  if (env.EMAIL_PROVIDER === 'console') {
    return createConsoleProvider();
  }

  return createResendProvider(env.EMAIL_API_KEY, env.EMAIL_FROM);
}

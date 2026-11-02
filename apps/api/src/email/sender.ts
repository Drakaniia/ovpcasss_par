import { createDb, createSettingsQueries } from '@par/db';
import { emailSenderSchema, type EmailSender } from '@par/shared';

import type { Env } from '../env';

/**
 * The sender and provider key outbound mail is built from. The administrator's
 * saved row (`settings.email-sender`) wins; the Worker variables
 * `EMAIL_FROM` and `EMAIL_API_KEY` are the deployment fallback they replaced.
 * Neither value leaves the Worker's mail path.
 */
export type ResolvedEmailSender = {
  from: string;
  apiKey: string;
  source: 'database' | 'environment';
};

export function resolveEmailSender(
  stored: unknown,
  env: { EMAIL_FROM: string; EMAIL_API_KEY: string },
): ResolvedEmailSender {
  const parsed = emailSenderSchema.safeParse(stored);

  // A row without a key is half-saved: the deployment pair stays authoritative.
  if (parsed.success && parsed.data.apiKey) {
    return { from: parsed.data.from, apiKey: parsed.data.apiKey, source: 'database' };
  }

  return { from: env.EMAIL_FROM, apiKey: env.EMAIL_API_KEY, source: 'environment' };
}

export async function emailSenderFor(env: Env): Promise<ResolvedEmailSender> {
  const stored = await createSettingsQueries(createDb(env.DB)).get<EmailSender>('email-sender');

  return resolveEmailSender(stored, {
    EMAIL_FROM: env.EMAIL_FROM,
    EMAIL_API_KEY: env.EMAIL_API_KEY,
  });
}

/** Last four characters, so the page can name a key without showing it. */
export function senderKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  return trimmed.length >= 4 ? `…${trimmed.slice(-4)}` : '';
}

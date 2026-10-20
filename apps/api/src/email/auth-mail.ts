import { resetPasswordTemplate, verifyEmailTemplate } from '@par/email';

import type { Env } from '../env';
import { enqueueEmail } from './queue';

export interface AccountMail {
  to: string;
  fullName: string;
  token: string;
  /** The API and the web build share an origin, so the link is built from the request. */
  origin: string;
}

/**
 * Account mail for M1 (spec §7.9, §7.4): the verification link and the
 * password-reset link. Sends go through the Queue, so an email outage never
 * fails the request that triggered it.
 */
export async function sendVerificationEmail(env: Env, mail: AccountMail): Promise<void> {
  await enqueueEmail(env, {
    to: mail.to,
    ...verifyEmailTemplate({
      fullName: mail.fullName,
      actionUrl: link(mail, '/verify-email', { email: mail.to }),
    }),
  });
}

export async function sendPasswordResetEmail(env: Env, mail: AccountMail): Promise<void> {
  await enqueueEmail(env, {
    to: mail.to,
    ...resetPasswordTemplate({ fullName: mail.fullName, actionUrl: link(mail, '/reset-password') }),
  });
}

function link(mail: AccountMail, path: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ token: mail.token, ...extra });
  return `${mail.origin}${path}?${params.toString()}`;
}

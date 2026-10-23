import { createDb, createEmailTokenQueries, createUserQueries } from '@par/db';
import type { Context } from 'hono';

import { sendVerificationEmail } from '../../../email/auth-mail';
import type { AppEnv } from '../../../env';
import { appOrigin } from '../../../lib/app-origin';
import { createId } from '../../../lib/ids';
import { consumeRateLimit } from '../../../lib/rate-limit';
import { createOpaqueToken, hashToken } from '../../../lib/tokens';

export type ResendOutcome =
  { ok: true } | { ok: false; code: 'RATE_LIMITED'; retryAfterSeconds: number };

const ACCOUNT_RULE = { limit: 3, windowSeconds: 900 };
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Rebuilds a verification link (spec §7.4). Always succeeds — whether the
 * address has an account is never revealed — and invalidating the outstanding
 * token leaves the newest link as the only live one.
 */
export async function resendVerification(
  c: Context<AppEnv>,
  emailInput: string,
): Promise<ResendOutcome> {
  const email = emailInput.trim().toLowerCase();

  const limit = await consumeRateLimit(c.env, `resend-verification:${email}`, ACCOUNT_RULE);
  if (!limit.allowed) {
    return { ok: false, code: 'RATE_LIMITED', retryAfterSeconds: limit.retryAfterSeconds };
  }

  const db = createDb(c.env.DB);
  const user = await createUserQueries(db).findByEmail(email);
  if (user && !user.emailVerifiedAt) {
    const now = new Date().toISOString();
    const tokens = createEmailTokenQueries(db);
    await tokens.invalidateOutstanding(user.id, 'VERIFY', now);

    const token = createOpaqueToken();
    await tokens.insert({
      id: createId(),
      userId: user.id,
      kind: 'VERIFY',
      tokenHash: await hashToken(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    await sendVerificationEmail(c.env, {
      to: email,
      fullName: user.fullName,
      token,
      origin: appOrigin(c),
    });
  }

  return { ok: true };
}

import { createDb, createUserQueries, type NewUserRow } from '@par/db';
import type { Account, LoginInput } from '@par/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { verifyPassword } from '../../../lib/password';
import { consumeRateLimit } from '../../../lib/rate-limit';
import { toAccount } from '../../../lib/user-view';
import { signInGate } from '../domain/sign-in';
import { isBootstrapAdmin, parseBootstrapAdmins } from './config';
import { issueSession } from './session-issue';

export type LoginOutcome =
  | { ok: true; account: Account; token: string }
  | { ok: false; code: 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'EMAIL_NOT_VERIFIED' }
  | { ok: false; code: 'RATE_LIMITED'; retryAfterSeconds: number };

const ACCOUNT_RULE = { limit: 10, windowSeconds: 900 };

/**
 * Verifies credentials, applies the status gate, and issues a session (spec
 * §7.4). Credentials are checked before the status so a disabled or unverified
 * account is only revealed to someone who already knows the password.
 */
export async function login(
  c: Context<AppEnv>,
  input: LoginInput,
  options: { cookie?: boolean } = {},
): Promise<LoginOutcome> {
  const email = input.email.trim().toLowerCase();

  const limit = await consumeRateLimit(c.env, `login:${email}`, ACCOUNT_RULE);
  if (!limit.allowed) {
    return { ok: false, code: 'RATE_LIMITED', retryAfterSeconds: limit.retryAfterSeconds };
  }

  const users = createUserQueries(createDb(c.env.DB));
  const user = await users.findByEmail(email);

  if (!user || !(await verifyPassword(input.password, user.passwordHash, user.hashParams))) {
    await recordAudit(c, {
      actorUserId: user?.id ?? null,
      actorRole: user?.role ?? null,
      action: 'LOGIN_FAILED',
      entityType: 'user',
      entityId: user?.id ?? null,
      comment: email,
    });
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }

  const gate = signInGate(user.status);
  if (!gate.allowed) return { ok: false, code: gate.reason };

  const now = new Date().toISOString();
  const patch: Partial<NewUserRow> = { lastSignedInAt: now };
  // A bootstrap address that verified before the variable existed is promoted here.
  if (
    user.role !== 'ADMIN' &&
    isBootstrapAdmin(email, parseBootstrapAdmins(c.env.BOOTSTRAP_ADMIN_EMAILS))
  ) {
    patch.role = 'ADMIN';
    patch.status = 'ACTIVE';
  }

  const signedIn = (await users.update(user.id, patch, now)) ?? user;
  const token = await issueSession(c, signedIn, now, options);
  await recordAudit(c, {
    actorUserId: user.id,
    actorRole: signedIn.role,
    action: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
  });

  return { ok: true, account: toAccount(signedIn), token };
}

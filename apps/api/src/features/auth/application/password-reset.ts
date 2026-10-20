import {
  createDb,
  createEmailTokenQueries,
  createSessionQueries,
  createUserQueries,
  type NewUserRow,
} from '@par/db';
import type { Context } from 'hono';

import { sendPasswordResetEmail } from '../../../email/auth-mail';
import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { createId } from '../../../lib/ids';
import { hashPassword } from '../../../lib/password';
import { consumeRateLimit } from '../../../lib/rate-limit';
import { createOpaqueToken, hashToken } from '../../../lib/tokens';

export type ForgotOutcome =
  { ok: true } | { ok: false; code: 'RATE_LIMITED'; retryAfterSeconds: number };

export type ResetOutcome = { ok: true } | { ok: false; code: 'TOKEN_INVALID' };

const ACCOUNT_RULE = { limit: 3, windowSeconds: 900 };
const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Sends a reset link for an address that has an account (spec §7.4). Always
 * reports success, so a caller cannot learn whether the address is registered.
 */
export async function requestPasswordReset(
  c: Context<AppEnv>,
  emailInput: string,
): Promise<ForgotOutcome> {
  const email = emailInput.trim().toLowerCase();

  const limit = await consumeRateLimit(c.env, `forgot-password:${email}`, ACCOUNT_RULE);
  if (!limit.allowed) {
    return { ok: false, code: 'RATE_LIMITED', retryAfterSeconds: limit.retryAfterSeconds };
  }

  const db = createDb(c.env.DB);
  const user = await createUserQueries(db).findByEmail(email);
  if (user) {
    const now = new Date().toISOString();
    const tokens = createEmailTokenQueries(db);
    await tokens.invalidateOutstanding(user.id, 'RESET', now);

    const token = createOpaqueToken();
    await tokens.insert({
      id: createId(),
      userId: user.id,
      kind: 'RESET',
      tokenHash: await hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    await sendPasswordResetEmail(c.env, {
      to: email,
      fullName: user.fullName,
      token,
      origin: new URL(c.req.url).origin,
    });

    await recordAudit(c, {
      actorUserId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'user',
      entityId: user.id,
    });
  }

  return { ok: true };
}

/**
 * Spends a reset token, sets the new password, and revokes every session
 * (spec §7.4). Possession of the token proves the mailbox, so an unverified
 * account becomes verified-and-pending-role here.
 */
export async function resetPassword(
  c: Context<AppEnv>,
  token: string,
  password: string,
): Promise<ResetOutcome> {
  const db = createDb(c.env.DB);
  const tokens = createEmailTokenQueries(db);
  const now = new Date().toISOString();
  const active = await tokens.findActive('RESET', await hashToken(token), now);
  if (!active) return { ok: false, code: 'TOKEN_INVALID' };
  if (!(await tokens.markUsed(active.id, now))) return { ok: false, code: 'TOKEN_INVALID' };

  const users = createUserQueries(db);
  const user = await users.findById(active.userId);
  if (!user) return { ok: false, code: 'TOKEN_INVALID' };

  const { hash, params } = await hashPassword(password);
  const patch: Partial<NewUserRow> = { passwordHash: hash, hashParams: params };
  if (!user.emailVerifiedAt) {
    patch.emailVerifiedAt = now;
    if (user.status === 'PENDING_VERIFICATION') patch.status = 'PENDING_ROLE';
  }
  await users.update(user.id, patch, now);
  await createSessionQueries(db).deleteForUser(user.id);

  await recordAudit(c, {
    actorUserId: user.id,
    actorRole: user.role,
    action: 'PASSWORD_RESET',
    entityType: 'user',
    entityId: user.id,
  });

  return { ok: true };
}

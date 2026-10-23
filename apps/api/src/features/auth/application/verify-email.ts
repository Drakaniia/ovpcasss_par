import { createDb, createEmailTokenQueries, createUserQueries, type NewUserRow } from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { hashToken } from '../../../lib/tokens';
import { isBootstrapAdmin, parseBootstrapAdmins } from './config';

export type VerifyEmailOutcome = { ok: true } | { ok: false; code: 'TOKEN_INVALID' };

/**
 * Redeems a verification link (spec §7.4) and activates the account. The token
 * is single-use, so losing the race to `markUsed` is treated exactly like an
 * expired link.
 */
export async function verifyEmail(c: Context<AppEnv>, token: string): Promise<VerifyEmailOutcome> {
  const db = createDb(c.env.DB);
  const tokens = createEmailTokenQueries(db);
  const now = new Date().toISOString();
  const active = await tokens.findActive('VERIFY', await hashToken(token), now);
  if (!active) return { ok: false, code: 'TOKEN_INVALID' };
  if (!(await tokens.markUsed(active.id, now))) return { ok: false, code: 'TOKEN_INVALID' };

  const users = createUserQueries(db);
  const user = await users.findById(active.userId);
  if (!user) return { ok: false, code: 'TOKEN_INVALID' };

  const patch: Partial<NewUserRow> = { emailVerifiedAt: now };
  if (user.status === 'PENDING_VERIFICATION') patch.status = 'ACTIVE';
  if (user.role === null) patch.role = 'PERSONNEL';
  // A bootstrap address becomes an Admin so the office has one to start with.
  if (isBootstrapAdmin(user.email, parseBootstrapAdmins(c.env.BOOTSTRAP_ADMIN_EMAILS))) {
    patch.role = 'ADMIN';
    patch.status = 'ACTIVE';
  }
  await users.update(user.id, patch, now);

  await recordAudit(c, {
    actorUserId: user.id,
    actorRole: patch.role ?? user.role,
    action: 'EMAIL_VERIFIED',
    entityType: 'user',
    entityId: user.id,
  });

  return { ok: true };
}

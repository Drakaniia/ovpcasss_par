import { createDb, createEmailTokenQueries, createUserQueries, type NewUserRow } from '@par/db';
import type { RegisterInput } from '@par/shared';
import type { Context } from 'hono';

import { sendVerificationEmail } from '../../../email/auth-mail';
import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { createId } from '../../../lib/ids';
import { hashPassword } from '../../../lib/password';
import { createOpaqueToken, hashToken } from '../../../lib/tokens';
import { isAllowedDomain } from '../domain/email-domain';
import { parseAllowedDomains } from './config';

export type RegisterOutcome = { ok: true } | { ok: false; code: 'DOMAIN_NOT_ALLOWED' };

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a pending account and mails its verification link (spec §7.4). An
 * address that is already registered returns success without a write, so the
 * response never reveals whether an account exists (UI spec §7.1).
 */
export async function register(c: Context<AppEnv>, input: RegisterInput): Promise<RegisterOutcome> {
  const email = input.email.trim().toLowerCase();
  if (!isAllowedDomain(email, parseAllowedDomains(c.env.ALLOWED_EMAIL_DOMAINS))) {
    return { ok: false, code: 'DOMAIN_NOT_ALLOWED' };
  }

  const db = createDb(c.env.DB);
  const users = createUserQueries(db);
  const existing = await users.findByEmail(email);
  if (existing) return { ok: true };

  const now = new Date().toISOString();
  const { hash, params } = await hashPassword(input.password);
  const row: NewUserRow = {
    id: createId(),
    email,
    passwordHash: hash,
    hashParams: params,
    fullName: input.fullName,
    role: null,
    status: 'PENDING_VERIFICATION',
    campusUnit: input.campusUnit ?? null,
    campusId: input.campusId ?? null,
    unitId: input.unitId ?? null,
    contactNumber: input.contactNumber ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // A soft-deleted address still occupies the unique email index; v1 has no delete path.
  await users.insert(row);

  const token = createOpaqueToken();
  await createEmailTokenQueries(db).insert({
    id: createId(),
    userId: row.id,
    kind: 'VERIFY',
    tokenHash: await hashToken(token),
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
    createdAt: now,
    updatedAt: now,
  });

  await sendVerificationEmail(c.env, {
    to: email,
    fullName: input.fullName,
    token,
    origin: new URL(c.req.url).origin,
  });

  await recordAudit(c, {
    actorUserId: row.id,
    actorRole: null,
    action: 'REGISTER',
    entityType: 'user',
    entityId: row.id,
  });

  return { ok: true };
}

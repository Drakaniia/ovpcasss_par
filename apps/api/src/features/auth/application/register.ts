import { createDb, createEmailTokenQueries, createUserQueries, type NewUserRow } from '@par/db';
import type { RegisterInput } from '@par/shared';
import type { Context } from 'hono';

import { sendVerificationEmail } from '../../../email/auth-mail';
import type { AppEnv } from '../../../env';
import { appOrigin } from '../../../lib/app-origin';
import { recordAudit } from '../../../lib/audit';
import { createId } from '../../../lib/ids';
import { hashPassword } from '../../../lib/password';
import { createOpaqueToken, hashToken } from '../../../lib/tokens';

export type RegisterOutcome = { ok: true };

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a PERSONNEL account and mails its verification link (spec §13).
 * Registration is open; email verification still gates sign-in, and the
 * account lands on the personnel dashboard.
 * An address that is already registered returns success without a write, so the
 * response never reveals whether an account exists (UI spec §7.1).
 */
export async function register(c: Context<AppEnv>, input: RegisterInput): Promise<RegisterOutcome> {
  const email = input.email.trim().toLowerCase();

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
    role: 'PERSONNEL',
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
    origin: appOrigin(c),
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

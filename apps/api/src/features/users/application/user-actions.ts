import { createDb, createSessionQueries, createUserQueries } from '@par/db';
import type { AdminUser, Role } from '@par/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { toAdminUser } from '../../../lib/user-view';
import { notify } from '../../notifications/application/notify';
import { isSelfTarget } from '../domain/admin-guard';
import { roleLabel, statusAfterRoleAssignment } from '../domain/role-change';

/** Every mutating action reports one of these; the route turns it into HTTP. */
export type AdminActionResult =
  | { status: 'ok'; user: AdminUser }
  | { status: 'not-found' }
  | { status: 'forbidden'; message: string }
  | { status: 'conflict'; message: string };

export async function assignRole(
  c: Context<AppEnv>,
  actorUserId: string,
  targetId: string,
  role: Role,
): Promise<AdminActionResult> {
  const users = createUserQueries(createDb(c.env.DB));
  const target = await users.findById(targetId);

  if (!target) return { status: 'not-found' };
  if (isSelfTarget(actorUserId, targetId)) {
    return { status: 'forbidden', message: 'You cannot change your own role.' };
  }

  const updated = await users.update(
    targetId,
    { role, status: statusAfterRoleAssignment(target.status) },
    new Date().toISOString(),
  );

  if (!updated) return { status: 'not-found' };

  await recordAudit(c, {
    actorUserId,
    actorRole: 'ADMIN',
    action: 'ROLE_ASSIGNED',
    entityType: 'user',
    entityId: targetId,
    toStatus: role,
  });

  await notify(c.env, {
    userId: targetId,
    kind: 'ACCOUNT',
    description: `Your role was assigned: ${roleLabel(role)}`,
    target: { kind: 'home' },
    email: { to: updated.email, recipientName: updated.fullName },
  });

  return { status: 'ok', user: toAdminUser(updated) };
}

export async function approveUser(
  c: Context<AppEnv>,
  actorUserId: string,
  targetId: string,
): Promise<AdminActionResult> {
  const users = createUserQueries(createDb(c.env.DB));
  const target = await users.findById(targetId);

  if (!target) return { status: 'not-found' };
  if (isSelfTarget(actorUserId, targetId)) {
    return { status: 'forbidden', message: 'You cannot activate your own account.' };
  }
  if (!target.role) {
    return { status: 'conflict', message: 'Assign a role before activating this account.' };
  }

  const updated = await users.update(targetId, { status: 'ACTIVE' }, new Date().toISOString());
  if (!updated) return { status: 'not-found' };

  await recordAudit(c, {
    actorUserId,
    actorRole: 'ADMIN',
    action: 'ACCOUNT_APPROVED',
    entityType: 'user',
    entityId: targetId,
    fromStatus: target.status,
    toStatus: 'ACTIVE',
  });

  return { status: 'ok', user: toAdminUser(updated) };
}

export async function disableUser(
  c: Context<AppEnv>,
  actorUserId: string,
  targetId: string,
): Promise<AdminActionResult> {
  const db = createDb(c.env.DB);
  const users = createUserQueries(db);
  const target = await users.findById(targetId);

  if (!target) return { status: 'not-found' };
  if (isSelfTarget(actorUserId, targetId)) {
    return { status: 'forbidden', message: 'You cannot disable your own account.' };
  }

  const updated = await users.update(targetId, { status: 'DISABLED' }, new Date().toISOString());
  if (!updated) return { status: 'not-found' };

  await createSessionQueries(db).deleteForUser(targetId);

  await recordAudit(c, {
    actorUserId,
    actorRole: 'ADMIN',
    action: 'ACCOUNT_DISABLED',
    entityType: 'user',
    entityId: targetId,
    fromStatus: target.status,
    toStatus: 'DISABLED',
  });

  return { status: 'ok', user: toAdminUser(updated) };
}

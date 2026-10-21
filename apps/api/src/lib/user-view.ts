import type { Account, AdminUser } from '@par/shared';
import type { UserRow } from '@par/db';

/**
 * The account shape every authenticated response uses (spec §7.4). A signature's
 * object key never leaves the API — the client only learns whether one is on
 * file. `unreadNotifications` is passed by routes that have already counted it.
 */
export function toAccount(user: UserRow, unreadNotifications?: number): Account {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    campusUnit: user.campusUnit,
    contactNumber: user.contactNumber,
    hasSignature: user.signatureObjectKey !== null,
    hasPassword: user.hasPassword,
    ...(unreadNotifications === undefined ? {} : { unreadNotifications }),
  };
}

/** The administrator's user-directory shape (UI spec §7.15). */
export function toAdminUser(user: UserRow): AdminUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    campusUnit: user.campusUnit,
    contactNumber: user.contactNumber,
    registeredAt: user.createdAt,
    emailVerifiedAt: user.emailVerifiedAt,
    lastSignedInAt: user.lastSignedInAt,
  };
}

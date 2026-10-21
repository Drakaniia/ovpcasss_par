import type { SessionQueries, UserQueries, UserRow } from '@par/db';
import type {
  Account,
  ChangePasswordInput,
  EmailPreferencesInput,
  EmailPreferencesResponse,
  UpdateProfileInput,
} from '@par/shared';

import { hashPassword, verifyPassword } from '../../../lib/password';
import { hashToken } from '../../../lib/tokens';
import { toAccount } from '../../../lib/user-view';
import type { NotificationRepository } from '../../notifications/infrastructure/notification-repository';
import { normalizeOptional } from '../domain/profile';

/**
 * Profile use cases (spec §7.3). The routes own the request; these own the
 * rules, so the same edit path serves the web and desktop callers unchanged.
 */

/** Null when the session points at an account that is no longer there. */
export async function getAccount(
  users: UserQueries,
  notifications: NotificationRepository,
  userId: string,
): Promise<Account | null> {
  const user = await users.findById(userId);
  if (!user) return null;

  return toAccount(user, await notifications.countUnread(userId));
}

export async function updateProfile(
  users: UserQueries,
  user: UserRow,
  input: UpdateProfileInput,
  at: string,
): Promise<Account> {
  const updated = await users.update(
    user.id,
    {
      fullName: input.fullName,
      campusUnit: normalizeOptional(input.campusUnit),
      contactNumber: normalizeOptional(input.contactNumber),
    },
    at,
  );

  return toAccount(updated ?? user);
}

/** The profile's Email section (email spec §8). `account` is always on. */
export function toEmailPreferences(user: UserRow): EmailPreferencesResponse {
  return {
    workflow: user.emailWorkflow,
    reminders: user.emailReminders,
    account: true,
  };
}

export async function updateEmailPreferences(
  users: UserQueries,
  user: UserRow,
  input: EmailPreferencesInput,
  at: string,
): Promise<EmailPreferencesResponse> {
  const updated = await users.update(
    user.id,
    {
      ...(input.workflow === undefined ? {} : { emailWorkflow: input.workflow }),
      ...(input.reminders === undefined ? {} : { emailReminders: input.reminders }),
    },
    at,
  );

  return toEmailPreferences(updated ?? user);
}

export type PasswordChangeOutcome = 'ok' | 'wrong-current';

/**
 * Verifies the current password, stores the new hash, and revokes every other
 * session. The caller keeps the session they changed the password from, so the
 * profile page (which does not re-authenticate) stays usable; other devices are
 * signed out because their tokens were issued under the old password.
 */
export async function changePassword(
  users: UserQueries,
  sessions: SessionQueries,
  user: UserRow,
  input: ChangePasswordInput,
  currentToken: string | null,
  at: string,
): Promise<PasswordChangeOutcome> {
  const matches = await verifyPassword(input.currentPassword, user.passwordHash, user.hashParams);
  if (!matches) return 'wrong-current';

  const { hash, params } = await hashPassword(input.newPassword);
  await users.update(user.id, { passwordHash: hash, hashParams: params, hasPassword: true }, at);

  const current = currentToken
    ? await sessions.findByTokenHash(await hashToken(currentToken))
    : null;
  await sessions.deleteForUser(user.id);
  if (current) await sessions.insert(current);

  return 'ok';
}

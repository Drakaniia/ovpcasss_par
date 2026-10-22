import type { SessionQueries, UserQueries, UserRow } from '@par/db';
import { describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../../../lib/password';
import { changePassword } from './profile';

const AT = new Date('2026-10-21T08:00:00.000Z').toISOString();

async function account(): Promise<UserRow> {
  const { hash, params } = await hashPassword('current-password-1');

  return {
    id: 'u1',
    email: 'user@example.edu',
    passwordHash: hash,
    hashParams: params,
    hasPassword: true,
  } as unknown as UserRow;
}

function queries() {
  const update = vi.fn(async () => null);
  const users = { update } as unknown as UserQueries;
  const sessions = {
    findByTokenHash: vi.fn(async () => null),
    deleteForUser: vi.fn(async () => undefined),
    insert: vi.fn(async () => undefined),
  } as unknown as SessionQueries;

  return { users, sessions, update };
}

describe('change password', () => {
  it('refuses a wrong current password without writing', async () => {
    const { users, sessions, update } = queries();

    const outcome = await changePassword(
      users,
      sessions,
      await account(),
      { currentPassword: 'not-the-password', newPassword: 'a-new-password-1' },
      null,
      AT,
    );

    expect(outcome).toBe('wrong-current');
    expect(update).not.toHaveBeenCalled();
  });

  it('stores the new hash and marks the account as having a password', async () => {
    const { users, sessions, update } = queries();

    const outcome = await changePassword(
      users,
      sessions,
      await account(),
      { currentPassword: 'current-password-1', newPassword: 'a-new-password-1' },
      null,
      AT,
    );

    expect(outcome).toBe('ok');
    expect(update).toHaveBeenCalledWith('u1', expect.objectContaining({ hasPassword: true }), AT);
  });
});

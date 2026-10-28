import type { Account } from '@par/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  profileGet: vi.fn(),
  preferencesGet: vi.fn(),
  preferencesSave: vi.fn(),
  restoreSessionToken: vi.fn(async () => undefined),
  forgetSessionToken: vi.fn(async () => undefined),
}));

vi.mock('$lib/api/client', () => ({
  api: {
    profile: { get: mocks.profileGet },
    preferences: { get: mocks.preferencesGet, save: mocks.preferencesSave },
  },
}));

vi.mock('$lib/platform/session-token', () => ({
  restoreSessionToken: mocks.restoreSessionToken,
  forgetSessionToken: mocks.forgetSessionToken,
}));

const account: Account = {
  id: 'user-1',
  email: 'maria@univ.edu',
  fullName: 'Maria Santos',
  role: 'PERSONNEL',
  status: 'ACTIVE',
};

async function modules() {
  const session = await import('./session.svelte');
  const preferences = await import('$lib/features/preferences/application/preferences.svelte');
  return { session, preferences };
}

beforeEach(() => {
  vi.resetModules();
  mocks.profileGet.mockReset();
  mocks.preferencesGet.mockReset();
  mocks.preferencesSave.mockReset();
});

describe('loadSession preferences', () => {
  it('reads preferences for an account a sign-in form set before navigating', async () => {
    mocks.preferencesGet.mockResolvedValue({
      preferences: {
        tour: { version: 1, outcome: 'completed', at: '2026-10-20T00:00:00.000Z' },
      },
    });

    const { session, preferences } = await modules();

    // What LoginForm does on success: the account is known before the shell mounts.
    session.setSessionUser(account);
    expect(preferences.preferencesState.loaded).toBe(false);

    await session.loadSession();

    expect(mocks.profileGet).not.toHaveBeenCalled();
    expect(mocks.preferencesGet).toHaveBeenCalledTimes(1);
    expect(preferences.tourRecordKnown()).toBe(true);
    expect(preferences.tourRecord()).toMatchObject({ outcome: 'completed' });
  });

  it('leaves a record it could not read unknown instead of empty', async () => {
    mocks.profileGet.mockResolvedValue(account);
    mocks.preferencesGet.mockRejectedValue(new Error('offline'));

    const { session, preferences } = await modules();

    await session.loadSession();

    expect(preferences.preferencesState.loaded).toBe(true);
    expect(preferences.tourRecordKnown()).toBe(false);
  });

  it('reads the account before its preferences on a fresh launch', async () => {
    mocks.profileGet.mockResolvedValue(account);
    mocks.preferencesGet.mockResolvedValue({
      preferences: { tour: { version: 1, outcome: 'skipped', at: '2026-10-20T00:00:00.000Z' } },
    });

    const { session, preferences } = await modules();

    await session.loadSession();

    expect(mocks.profileGet).toHaveBeenCalledTimes(1);
    expect(mocks.preferencesGet).toHaveBeenCalledTimes(1);
    expect(preferences.tourRecord()).toMatchObject({ outcome: 'skipped' });
  });
});

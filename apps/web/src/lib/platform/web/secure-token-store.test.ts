import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenStore } from './secure-token-store';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  profile: vi.fn(),
}));
vi.mock('$lib/api/client', () => ({
  api: {
    preferences: { get: mocks.get, save: mocks.save },
    profile: { get: mocks.profile },
  },
}));

const a = { id: 'a', name: 'Account A', email: 'a@buksu.edu.ph' };
const b = { id: 'b', name: 'Account B', email: 'b@buksu.edu.ph' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ preferences: { rememberedAccounts: [b, a] } });
  mocks.profile.mockResolvedValue({ id: 'b' });
});

describe('browser remembered accounts', () => {
  it('reads persisted identities after adapter recreation and marks only the signed-in account active', async () => {
    const expected = [
      { ...b, active: true },
      { ...a, active: false },
    ];
    expect(await createTokenStore().list()).toEqual(expected);
    expect(await createTokenStore().list()).toEqual(expected);
  });

  it('forgets only the chosen identity through the preferences API', async () => {
    await createTokenStore().forget('a');
    expect(mocks.save).toHaveBeenCalledWith({ rememberedAccounts: [b] });
  });

  it('never exposes a browser token or switches without sign-in', async () => {
    const store = createTokenStore();
    expect(await store.read()).toBeNull();
    expect(await store.switchTo('a')).toBeNull();
    await store.remember(a);
    await store.write('not-a-browser-token', a);
    await store.clear();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('reports failed reads instead of pretending the list is empty', async () => {
    mocks.get.mockRejectedValue(new Error('offline'));
    await expect(createTokenStore().list()).rejects.toThrow('offline');
  });
});

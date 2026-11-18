import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenStore } from './secure-token-store';

const mocks = vi.hoisted(() => ({
  accounts: vi.fn(),
  switchAccount: vi.fn(),
  forgetAccount: vi.fn(),
}));
vi.mock('$lib/api/client', () => ({ api: { auth: mocks } }));
const accounts = [
  { id: 'b', name: 'Account B', email: 'b@buksu.edu.ph', active: true },
  { id: 'a', name: 'Account A', email: 'a@buksu.edu.ph', active: false },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.accounts.mockResolvedValue({ accounts });
});

describe('browser saved sessions', () => {
  it('reads only accounts authenticated on this browser, including after adapter recreation', async () => {
    expect(await createTokenStore().list()).toEqual(accounts);
    expect(await createTokenStore().list()).toEqual(accounts);
  });

  it('switches through the API without returning a JavaScript token', async () => {
    const store = createTokenStore();
    expect(await store.switchTo('a')).toBe(true);
    expect(mocks.switchAccount).toHaveBeenCalledWith('a');
    expect(await store.read()).toBeNull();
  });

  it('revokes the chosen saved session through the API', async () => {
    await createTokenStore().forget('a');
    expect(mocks.forgetAccount).toHaveBeenCalledWith('a');
  });

  it('reports failed switching instead of claiming success', async () => {
    mocks.switchAccount.mockRejectedValue(new Error('offline'));
    await expect(createTokenStore().switchTo('a')).rejects.toThrow('offline');
  });

  it('reports failed reads instead of pretending the list is empty', async () => {
    mocks.accounts.mockRejectedValue(new Error('offline'));
    await expect(createTokenStore().list()).rejects.toThrow('offline');
  });
});

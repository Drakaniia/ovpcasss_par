import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http';

import { switchToAccount } from './session-token';

const mocks = vi.hoisted(() => ({ switchTo: vi.fn(), shell: 'web' }));
vi.mock('./index', () => ({
  platform: async () => ({ shell: mocks.shell, tokens: { switchTo: mocks.switchTo } }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.shell = 'web';
});

describe('platform account switching', () => {
  it('reports a switched browser cookie without installing a bearer token', async () => {
    mocks.switchTo.mockResolvedValue(true);
    expect(await switchToAccount('a')).toBe('switched');
  });

  it('requests sign-in only when the API reports an expired saved session', async () => {
    mocks.switchTo.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Expired'));
    expect(await switchToAccount('a')).toBe('sign-in');
  });

  it('propagates network errors instead of opening the sign-in drawer', async () => {
    mocks.switchTo.mockRejectedValue(new Error('offline'));
    await expect(switchToAccount('a')).rejects.toThrow('offline');
  });

  it('still restores desktop bearer tokens', async () => {
    mocks.shell = 'desktop';
    mocks.switchTo.mockResolvedValue('desktop-token');
    expect(await switchToAccount('a')).toBe('switched');
  });
});

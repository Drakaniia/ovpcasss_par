import type { UserRow } from '@par/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../../../env';
import { issueSession } from './session-issue';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@par/db', () => ({
  createDb: () => ({}),
  createSessionQueries: () => ({ insert: mocks.insert }),
  createUserQueries: () => ({ findById: mocks.findById, update: mocks.update }),
}));

const identity = (id: string) => ({ id, name: `Account ${id}`, email: `${id}@buksu.edu.ph` });
const user = (id: string, preferences = '{}') =>
  ({
    id,
    fullName: `Account ${id}`,
    email: `${id}@buksu.edu.ph`,
    preferences,
  }) as UserRow;
const at = '2026-11-18T00:00:00.000Z';

async function signIn(next: UserRow, previousId?: string, cookie = true) {
  const app = new Hono<AppEnv>();
  app.get('/', async (c) => {
    if (previousId) c.set('userId', previousId);
    await issueSession(c, next, at, { cookie });
    return c.body(null, 204);
  });
  return app.request('https://par.test/', {}, { DB: {} } as AppEnv['Bindings']);
}

beforeEach(() => vi.resetAllMocks());

describe('browser account remembering at session issuance', () => {
  it('keeps the previous account after A signs in as B, and survives the switch back', async () => {
    const a = user('a', JSON.stringify({ zoom: 1.2, rememberedAccounts: [identity('c')] }));
    const b = user('b', JSON.stringify({ zoom: 0.9 }));
    mocks.findById.mockResolvedValue(a);

    const response = await signIn(b, 'a');

    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    const savedB = JSON.parse(mocks.update.mock.calls[0]![1].preferences);
    expect(savedB).toEqual({
      zoom: 0.9,
      rememberedAccounts: [identity('b'), identity('a'), identity('c')],
    });
    expect(mocks.update.mock.calls[0]![0]).toBe('b');

    mocks.findById.mockResolvedValue(user('b', JSON.stringify(savedB)));
    await signIn(a, 'b');
    const savedA = JSON.parse(mocks.update.mock.calls[1]![1].preferences);
    expect(savedA.zoom).toBe(1.2);
    expect(savedA.rememberedAccounts).toEqual([identity('a'), identity('b'), identity('c')]);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });

  it('preserves remembered names on a fresh login without a previous cookie', async () => {
    await signIn(user('a', JSON.stringify({ rememberedAccounts: [identity('b')] })));
    expect(JSON.parse(mocks.update.mock.calls[0]![1].preferences).rememberedAccounts).toEqual([
      identity('a'),
      identity('b'),
    ]);
    expect(mocks.findById).not.toHaveBeenCalled();
  });

  it('deduplicates identities, updates the current name, and bounds the list', async () => {
    const accounts = Array.from({ length: 20 }, (_, i) => identity(`user-${i}`));
    const next = user('a', JSON.stringify({ rememberedAccounts: accounts }));
    mocks.findById.mockResolvedValue(user('b', JSON.stringify({ rememberedAccounts: accounts })));
    await signIn(next, 'b');
    const saved = JSON.parse(mocks.update.mock.calls[0]![1].preferences).rememberedAccounts;
    expect(saved).toHaveLength(20);
    expect(new Set(saved.map((account: { id: string }) => account.id)).size).toBe(20);
    expect(saved.slice(0, 2)).toEqual([identity('a'), identity('b')]);
  });

  it('does not link browser preferences when issuing a desktop token', async () => {
    const response = await signIn(user('a'), 'b', false);
    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
});

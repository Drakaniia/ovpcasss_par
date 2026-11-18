import type { SessionRow, UserRow } from '@par/db';
import { browserAccountsSchema } from '@par/shared';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../../../env';
import { requireSession } from '../../../middleware/auth';
import { requireSameOrigin } from '../../../middleware/csrf';
import { hashToken } from '../../../lib/tokens';
import { logout } from './logout';
import {
  forgetBrowserAccount,
  listBrowserAccounts,
  saveBrowserSession,
  switchBrowserAccount,
} from './browser-accounts';

const state = vi.hoisted(() => ({
  sessions: new Map<string, SessionRow>(),
  users: new Map<string, UserRow>(),
}));
vi.mock('@par/db', () => ({
  createDb: () => ({}),
  createAuditQueries: () => ({ insert: vi.fn() }),
  createSessionQueries: () => ({
    findByTokenHash: async (hash: string) => state.sessions.get(hash) ?? null,
    deleteByTokenHash: async (hash: string) => {
      state.sessions.delete(hash);
    },
    touch: vi.fn(),
  }),
  createUserQueries: () => ({ findById: async (id: string) => state.users.get(id) ?? null }),
}));

const prefix = '__Host-par_account_';
const origin = 'https://par.test';
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
let jar: Map<string, string>;
const app = new Hono<AppEnv>();
app.use('*', requireSameOrigin, requireSession);
app.get('/accounts', async (c) => c.json(await listBrowserAccounts(c)));
app.post('/switch', async (c) => {
  const { id } = await c.req.json();
  return c.body(null, (await switchBrowserAccount(c, id)) ? 204 : 401);
});
app.post('/save', async (c) => {
  const { id, token } = await c.req.json();
  await saveBrowserSession(c, id, token, expiresAt);
  return c.body(null, 204);
});
app.delete('/accounts/:id', async (c) => {
  await forgetBrowserAccount(c, c.req.param('id'));
  return c.body(null, 204);
});
app.post('/logout', async (c) => {
  await logout(c);
  return c.body(null, 204);
});

async function request(path: string, method = 'GET', body?: object, requestOrigin = origin) {
  const response = await app.request(
    `${origin}${path}`,
    {
      method,
      headers: {
        host: 'par.test',
        origin: requestOrigin,
        cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '),
        'content-type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    { DB: {} } as AppEnv['Bindings'],
  );
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const [name, value] = pair!.split('=');
    if (cookie.includes('Max-Age=0')) jar.delete(name!);
    else jar.set(name!, value!);
  }
  return response;
}

async function account(id: string, status = 'ACTIVE') {
  const token = `secret-${id}`;
  const tokenHash = await hashToken(token);
  state.users.set(id, {
    id,
    fullName: `Account ${id}`,
    email: `${id}@buksu.edu.ph`,
    status,
  } as UserRow);
  state.sessions.set(tokenHash, {
    id: `session-${id}`,
    userId: id,
    tokenHash,
    expiresAt,
  } as SessionRow);
  return token;
}

beforeEach(async () => {
  state.sessions.clear();
  state.users.clear();
  jar = new Map();
  jar.set('par_session', await account('a'));
  jar.set(`${prefix}b`, await account('b'));
});

describe('instant browser switching', () => {
  it('switches A to B and back using HttpOnly cookies without exposing tokens', async () => {
    expect((await request('/switch', 'POST', { id: 'b' })).status).toBe(204);
    expect(jar.get('par_session')).toBe('secret-b');
    expect(jar.get(`${prefix}a`)).toBe('secret-a');
    const response = await request('/accounts');
    const json = browserAccountsSchema.parse(await response.json());
    expect(json.accounts).toEqual(
      expect.arrayContaining([
        { id: 'a', name: 'Account a', email: 'a@buksu.edu.ph', active: false },
        { id: 'b', name: 'Account b', email: 'b@buksu.edu.ph', active: true },
      ]),
    );
    expect(JSON.stringify(json)).not.toContain('secret');
    const back = await request('/switch', 'POST', { id: 'a' });
    expect(back.status).toBe(204);
    expect(back.headers.get('set-cookie')).toContain('HttpOnly');
    expect(back.headers.get('set-cookie')).toContain('Secure');
    expect(back.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(jar.get('par_session')).toBe('secret-a');
  });

  it('saves both sessions after successful sign-in and retains them across requests', async () => {
    const response = await request('/save', 'POST', { id: 'b', token: 'secret-b' });
    expect(
      response.headers.getSetCookie().filter((cookie) => cookie.includes('HttpOnly')),
    ).toHaveLength(2);
    expect(jar.get(`${prefix}a`)).toBe('secret-a');
    expect(jar.get(`${prefix}b`)).toBe('secret-b');
    expect(
      browserAccountsSchema.parse(await (await request('/accounts')).json()).accounts,
    ).toHaveLength(2);
  });

  it('rejects a remembered identity without its session cookie, leaving A active', async () => {
    state.users.get('a')!.preferences = JSON.stringify({ rememberedAccounts: [{ id: 'c' }] });
    await account('c');
    expect((await request('/switch', 'POST', { id: 'c' })).status).toBe(401);
    expect(jar.get('par_session')).toBe('secret-a');
  });

  it('rejects a cookie relabelled with another account ID', async () => {
    jar.set(`${prefix}c`, 'secret-b');
    expect((await request('/switch', 'POST', { id: 'c' })).status).toBe(401);
    expect(jar.get('par_session')).toBe('secret-a');
  });

  it('rejects expired, disabled, and revoked sessions without replacing A', async () => {
    const hash = await hashToken('secret-b');
    state.sessions.get(hash)!.expiresAt = '2000-01-01T00:00:00.000Z';
    expect((await request('/switch', 'POST', { id: 'b' })).status).toBe(401);
    state.sessions.get(hash)!.expiresAt = expiresAt;
    state.users.get('b')!.status = 'DISABLED';
    expect((await request('/switch', 'POST', { id: 'b' })).status).toBe(401);
    state.users.get('b')!.status = 'ACTIVE';
    state.sessions.clear();
    expect((await request('/switch', 'POST', { id: 'b' })).status).toBe(401);
    expect(jar.get('par_session')).toBe('secret-a');
  });

  it('forgets B by revoking its saved session, not A', async () => {
    await request('/accounts/b', 'DELETE');
    expect(jar.has(`${prefix}b`)).toBe(false);
    expect(state.sessions.has(await hashToken('secret-b'))).toBe(false);
    expect(state.sessions.has(await hashToken('secret-a'))).toBe(true);
  });

  it('logout revokes and removes the active saved session while retaining the other account', async () => {
    await request('/switch', 'POST', { id: 'b' });
    await request('/logout', 'POST');
    expect(jar.has(`${prefix}b`)).toBe(false);
    expect(state.sessions.has(await hashToken('secret-b'))).toBe(false);
    expect(jar.get(`${prefix}a`)).toBe('secret-a');
    expect((await request('/switch', 'POST', { id: 'b' })).status).toBe(401);
  });

  it('blocks cross-origin switching even when only saved cookies remain', async () => {
    jar.delete('par_session');
    expect((await request('/switch', 'POST', { id: 'b' }, 'https://evil.test')).status).toBe(403);
    expect(jar.has('par_session')).toBe(false);
    expect((await request('/switch', 'POST', { id: 'b' })).status).toBe(204);
  });
});

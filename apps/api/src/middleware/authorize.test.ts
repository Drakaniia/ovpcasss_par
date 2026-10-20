import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { Role } from '@par/shared';

import type { AppEnv } from '../env';
import { requireRole } from './authorize';

/** Stands in for requireSession: `x-test-user` is a signed-in caller. */
const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  const userId = c.req.header('x-test-user');
  const role = c.req.header('x-test-role');

  if (userId) c.set('userId', userId);
  if (userId && role) c.set('role', role as Role);

  await next();
});

app.get('/admin', requireRole('ADMIN'), (c) => c.json({ ok: true }));
app.get('/review', requireRole('REVIEWER'), (c) => c.json({ ok: true }));

function request(headers: Record<string, string> = {}) {
  return app.request('/admin', { headers });
}

describe('requireRole', () => {
  it('asks a caller with no session to sign in', async () => {
    const response = await request();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' },
    });
  });

  it('rejects a signed-in caller with the wrong role', async () => {
    const response = await request({ 'x-test-user': 'u1', 'x-test-role': 'REVIEWER' });

    expect(response.status).toBe(403);
  });

  it('rejects a caller whose role was never assigned', async () => {
    const response = await request({ 'x-test-user': 'u1' });

    expect(response.status).toBe(403);
  });

  it('admits the role it gates on', async () => {
    const response = await request({ 'x-test-user': 'u1', 'x-test-role': 'ADMIN' });

    expect(response.status).toBe(200);
  });

  it('admits an admin to a gate owned by another role', async () => {
    const response = await app.request('/review', {
      headers: { 'x-test-user': 'u1', 'x-test-role': 'ADMIN' },
    });

    expect(response.status).toBe(200);
  });
});

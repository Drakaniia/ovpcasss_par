import { createMiddleware } from 'hono/factory';
import { describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../../env';

vi.mock('../../middleware/auth', () => ({
  requireSession: createMiddleware<AppEnv>(async (c, next) => {
    const role = c.req.header('x-test-role');
    if (role) {
      c.set('userId', 'test-account');
      c.set('role', role as 'ADMIN' | 'PERSONNEL');
    }
    await next();
  }),
}));

import { reportRoutes } from './routes';

describe('report creation authorization', () => {
  it.each(['ADMIN', 'PERSONNEL'])(
    'admits %s and validates the activity before writing',
    async (role) => {
      const response = await reportRoutes.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test-role': role },
        body: '{}',
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    },
  );

  it('rejects signed-out creation', async () => {
    const response = await reportRoutes.request('/', { method: 'POST' });
    expect(response.status).toBe(401);
  });

  it('rejects a retired role', async () => {
    const response = await reportRoutes.request('/', {
      method: 'POST',
      headers: { 'x-test-role': 'REVIEWER' },
    });
    expect(response.status).toBe(403);
  });
});

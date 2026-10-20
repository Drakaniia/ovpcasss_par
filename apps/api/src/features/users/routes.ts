import { createDb, createUserQueries } from '@par/db';
import { assignUserRoleSchema } from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { toAdminUser } from '../../lib/user-view';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { listAdminUsers, parseUserListQuery } from './application/list-users';
import {
  assignRole,
  approveUser,
  disableUser,
  type AdminActionResult,
} from './application/user-actions';

/** Admin user management: list, role assignment, approve, disable (spec §7.3). Implemented in M1. */
export const userRoutes = new Hono<AppEnv>();

userRoutes.use('*', requireSession);
userRoutes.use('*', requireRole('ADMIN'));

function queries(c: Context<AppEnv>) {
  return createUserQueries(createDb(c.env.DB));
}

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to manage users' } }, 401);
}

function respond(c: Context<AppEnv>, result: AdminActionResult) {
  switch (result.status) {
    case 'ok':
      return c.json(result.user);
    case 'not-found':
      return c.json({ error: { code: 'NOT_FOUND', message: 'This account does not exist' } }, 404);
    case 'forbidden':
      return c.json({ error: { code: 'FORBIDDEN', message: result.message } }, 403);
    case 'conflict':
      return c.json({ error: { code: 'CONFLICT', message: result.message } }, 409);
  }
}

userRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const parsed = parseUserListQuery(c.req.query());
  if (!parsed.ok) {
    return c.json(
      {
        error: {
          code: 'INVALID_QUERY',
          message: 'That user filter is not supported',
          details: parsed.issues,
        },
      },
      400,
    );
  }

  return c.json(await listAdminUsers(queries(c), parsed.filter));
});

userRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const user = await queries(c).findById(c.req.param('id'));
  if (!user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'This account does not exist' } }, 404);
  }

  return c.json(toAdminUser(user));
});

userRoutes.patch('/:id/role', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const body = await c.req.json().catch(() => null);
  const parsed = assignUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'That role is not valid',
          details: parsed.error.issues,
        },
      },
      400,
    );
  }

  return respond(c, await assignRole(c, userId, c.req.param('id'), parsed.data.role));
});

userRoutes.post('/:id/approve', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  return respond(c, await approveUser(c, userId, c.req.param('id')));
});

userRoutes.post('/:id/disable', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  return respond(c, await disableUser(c, userId, c.req.param('id')));
});

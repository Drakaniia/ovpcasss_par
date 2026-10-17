import { createMiddleware } from 'hono/factory';

import type { Role } from '@par/shared';

import type { AppEnv } from '../env';

/** Role gate for a route group (spec §9). Admin does not imply reviewer or approver. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const role = c.get('role');

    if (!role || !roles.includes(role)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } }, 403);
    }

    await next();
  });
}

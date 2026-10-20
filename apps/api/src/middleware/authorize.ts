import { createMiddleware } from 'hono/factory';

import { actsAs, type Role } from '@par/shared';

import type { AppEnv } from '../env';

/** Role gate for a route group (spec §9). Admin stands in for every role. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Clients read 401 as "sign in" and 403 as "signed in, wrong role" (spec §10),
    // so a caller with no session must never be told the role is insufficient.
    if (!c.get('userId')) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
    }

    const role = c.get('role');

    if (!role || !roles.some((expected) => actsAs(role, expected))) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } }, 403);
    }

    await next();
  });
}

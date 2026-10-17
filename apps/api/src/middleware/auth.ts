import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../env';

/**
 * Resolves the session cookie or bearer token into `userId` and `role`
 * (spec §7.4). Implemented in M1 with hashed-token lookup in D1.
 */
export const requireSession = createMiddleware<AppEnv>(async (_c, next) => {
  await next();
});

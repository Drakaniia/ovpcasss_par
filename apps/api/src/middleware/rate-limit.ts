import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../env';

/**
 * Per-IP and per-account throttling for auth and presign routes (spec §7.4).
 * Implemented in M1 with the Workers rate-limiting binding.
 */
export const rateLimit = createMiddleware<AppEnv>(async (_c, next) => {
  await next();
});

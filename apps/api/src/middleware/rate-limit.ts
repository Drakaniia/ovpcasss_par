import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../env';
import { clientIp } from '../lib/request-context';
import { consumeRateLimit, type RateLimitRule } from '../lib/rate-limit';

/**
 * Per-IP throttling for a route (spec §7.4). The bucket is the route path plus
 * the caller's IP, so limits apply per endpoint rather than globally. Routes
 * that also need a per-account limit call `consumeRateLimit` with the account
 * as the bucket.
 */
export function rateLimit(rule: RateLimitRule) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const decision = await consumeRateLimit(
      c.env,
      `${c.req.path}:${clientIp(c) ?? 'unknown'}`,
      rule,
    );

    if (!decision.allowed) {
      c.header('retry-after', String(decision.retryAfterSeconds));
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
        429,
      );
    }

    await next();
  });
}

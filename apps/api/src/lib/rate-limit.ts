import { createDb, createRateLimitQueries } from '@par/db';

import type { Env } from '../env';

export interface RateLimitRule {
  /** Attempts allowed inside one window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Per-bucket throttling backed by a fixed-window D1 counter (spec §7.4). The
 * caller picks the bucket (route + IP, or route + account) and its own limit,
 * so each auth endpoint can be tuned independently.
 */
export async function consumeRateLimit(
  env: Env,
  bucket: string,
  rule: RateLimitRule,
  at: Date = new Date(),
): Promise<RateLimitDecision> {
  const windowMs = rule.windowSeconds * 1000;
  const start = new Date(Math.floor(at.getTime() / windowMs) * windowMs);
  const count = await createRateLimitQueries(createDb(env.DB)).consume(bucket, start.toISOString());

  return {
    allowed: count <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((start.getTime() + windowMs - at.getTime()) / 1000)),
  };
}

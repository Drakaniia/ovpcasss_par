import { lt, sql } from 'drizzle-orm';

import type { Database } from '../client';
import { rateLimitCounters } from '../schema/operations';

/**
 * Fixed-window brute-force counters (spec §7.4). `consume` increments the
 * bucket's row for the current window and returns the new count; the caller
 * compares it to its own limit. Windows are short, so a lockout clears itself.
 */
export function createRateLimitQueries(db: Database) {
  return {
    async consume(bucket: string, windowStart: string): Promise<number> {
      const rows = await db
        .insert(rateLimitCounters)
        .values({ bucket, windowStart, count: 1 })
        .onConflictDoUpdate({
          target: [rateLimitCounters.bucket, rateLimitCounters.windowStart],
          set: { count: sql`${rateLimitCounters.count} + 1` },
        })
        .returning({ count: rateLimitCounters.count });

      return rows[0]?.count ?? 1;
    },

    /** Cleanup cron: a window that closed long ago can never be counted again. */
    async deleteOlderThan(cutoff: string): Promise<number> {
      const removed = await db
        .delete(rateLimitCounters)
        .where(lt(rateLimitCounters.windowStart, cutoff))
        .returning({ bucket: rateLimitCounters.bucket });

      return removed.length;
    },
  };
}

export type RateLimitQueries = ReturnType<typeof createRateLimitQueries>;

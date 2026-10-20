import { and, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { idempotencyKeys } from '../schema/operations';

export interface IdempotencyRecord {
  key: string;
  userId: string;
  requestHash: string;
  response: string;
}

/**
 * Retried-submit replay (spec §7.2): a key is scoped to the user who sent it,
 * so two people can never see each other's stored response.
 */
export function createIdempotencyQueries(db: Database) {
  return {
    async find(key: string, userId: string): Promise<IdempotencyRecord | null> {
      const rows = await db
        .select()
        .from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.userId, userId)))
        .limit(1);

      return rows[0] ?? null;
    },

    /** The same key from a different user is a different request. */
    async save(input: IdempotencyRecord & { now: string }): Promise<void> {
      await db
        .insert(idempotencyKeys)
        .values({
          key: input.key,
          userId: input.userId,
          requestHash: input.requestHash,
          response: input.response,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoNothing();
    },
  };
}

export type IdempotencyQueries = ReturnType<typeof createIdempotencyQueries>;

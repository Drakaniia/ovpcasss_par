import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';

import type { Database } from '../client';
import { emailTokens, type EmailTokenKind } from '../schema/identity';

export type EmailTokenRow = typeof emailTokens.$inferSelect;
export type NewEmailTokenRow = typeof emailTokens.$inferInsert;

/**
 * Single-use verify and reset tokens (spec §7.4). The plaintext token never
 * reaches the database; lookups are by hash. `markUsed` only claims a row that
 * is still unused, so two concurrent redemptions cannot both succeed.
 */
export function createEmailTokenQueries(db: Database) {
  return {
    async insert(row: NewEmailTokenRow): Promise<void> {
      await db.insert(emailTokens).values(row);
    },

    /** An unused, unexpired token of the expected kind, or null. */
    async findActive(
      kind: EmailTokenKind,
      tokenHash: string,
      now: string,
    ): Promise<EmailTokenRow | null> {
      const rows = await db
        .select()
        .from(emailTokens)
        .where(
          and(
            eq(emailTokens.kind, kind),
            eq(emailTokens.tokenHash, tokenHash),
            isNull(emailTokens.usedAt),
            gt(emailTokens.expiresAt, now),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    /** True when this call is the one that spent the token. */
    async markUsed(id: string, at: string): Promise<boolean> {
      const claimed = await db
        .update(emailTokens)
        .set({ usedAt: at, updatedAt: at })
        .where(and(eq(emailTokens.id, id), isNull(emailTokens.usedAt)))
        .returning({ id: emailTokens.id });

      return claimed.length > 0;
    },

    /**
     * Cleanup cron (spec §7.1): expired links can never be redeemed, and a used
     * link only needs to survive long enough for an audit review. Rows that are
     * still active are never touched.
     */
    async deleteExpiredOrUsed(now: string, usedBefore: string): Promise<number> {
      const removed = await db
        .delete(emailTokens)
        .where(or(lt(emailTokens.expiresAt, now), lt(emailTokens.usedAt, usedBefore)))
        .returning({ id: emailTokens.id });

      return removed.length;
    },

    /** Resending invalidates outstanding tokens so only the newest link works. */
    async invalidateOutstanding(userId: string, kind: EmailTokenKind, at: string): Promise<void> {
      await db
        .update(emailTokens)
        .set({ usedAt: at, updatedAt: at })
        .where(
          and(
            eq(emailTokens.userId, userId),
            eq(emailTokens.kind, kind),
            isNull(emailTokens.usedAt),
          ),
        );
    },
  };
}

export type EmailTokenQueries = ReturnType<typeof createEmailTokenQueries>;

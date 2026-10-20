import { and, eq, gt, lt } from 'drizzle-orm';

import type { Database } from '../client';
import { sessions } from '../schema/identity';

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

/**
 * Session reads and writes (spec §7.4). Only hashes are stored, so a session is
 * looked up by the hash of the token the caller presented. Expired rows are
 * swept by the cleanup cron rather than being trusted to disappear.
 */
export function createSessionQueries(db: Database) {
  return {
    async insert(row: NewSessionRow): Promise<void> {
      await db.insert(sessions).values(row);
    },

    /** Null when the hash is unknown; expiry is checked by the caller against `now`. */
    async findByTokenHash(tokenHash: string): Promise<SessionRow | null> {
      const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
      return rows[0] ?? null;
    },

    async touch(id: string, at: string): Promise<void> {
      await db.update(sessions).set({ lastSeenAt: at, updatedAt: at }).where(eq(sessions.id, id));
    },

    async deleteByTokenHash(tokenHash: string): Promise<void> {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },

    /** Every session for one account — used when the password changes. */
    async deleteForUser(userId: string): Promise<void> {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    },

    /** Cleanup cron: drop rows that are already expired as of `at`. */
    async deleteExpired(at: string): Promise<number> {
      const before = await db
        .select()
        .from(sessions)
        .where(lt(sessions.expiresAt, at));

      if (before.length > 0) {
        await db.delete(sessions).where(lt(sessions.expiresAt, at));
      }

      return before.length;
    },

    async countActive(userId: string, at: string): Promise<number> {
      const rows = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, at)));

      return rows.length;
    },
  };
}

export type SessionQueries = ReturnType<typeof createSessionQueries>;

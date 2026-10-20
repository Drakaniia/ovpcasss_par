import { desc, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { emailOutbox } from '../schema/operations';

export type EmailOutboxRow = typeof emailOutbox.$inferSelect;
export type NewEmailOutboxRow = typeof emailOutbox.$inferInsert;

/**
 * Outbox visibility for the admin inbox (spec §7.9, §12). The Queue is the
 * delivery path; these rows let an administrator see what failed and why.
 */
export function createEmailOutboxQueries(db: Database) {
  return {
    async insert(row: NewEmailOutboxRow): Promise<void> {
      await db.insert(emailOutbox).values(row);
    },

    async countFailed(): Promise<number> {
      const rows = await db
        .select({ id: emailOutbox.id })
        .from(emailOutbox)
        .where(eq(emailOutbox.status, 'FAILED'));

      return rows.length;
    },

    async listRecent(limit: number): Promise<EmailOutboxRow[]> {
      return db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(limit);
    },
  };
}

export type EmailOutboxQueries = ReturnType<typeof createEmailOutboxQueries>;

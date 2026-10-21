import type { EmailDeliveryStatus } from '@par/shared';
import { and, desc, eq, like, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../client';
import { emailOutbox } from '../schema/operations';

export type EmailOutboxRow = typeof emailOutbox.$inferSelect;
export type NewEmailOutboxRow = typeof emailOutbox.$inferInsert;

export interface EmailOutboxFilter {
  status?: EmailDeliveryStatus;
  kind?: string;
  to?: string;
  page: number;
  size: number;
}

export interface EmailOutboxPage {
  rows: EmailOutboxRow[];
  total: number;
}

/**
 * Outbox visibility and delivery state (spec §7.9, email spec §9.3). The Queue
 * is the delivery path; this table is the record of what was tried, why it
 * failed, and what a resend should carry. `last_error` holds either the delivery
 * error or the suppression reason (email spec §9.2).
 */
export function createEmailOutboxQueries(db: Database) {
  return {
    async insert(row: NewEmailOutboxRow): Promise<void> {
      await db.insert(emailOutbox).values(row);
    },

    async findById(id: string): Promise<EmailOutboxRow | null> {
      const rows = await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async markSent(id: string, at: string): Promise<void> {
      await db
        .update(emailOutbox)
        .set({ status: 'SENT', lastError: null, updatedAt: at })
        .where(eq(emailOutbox.id, id));
    },

    async markFailed(id: string, error: string, attempts: number, at: string): Promise<void> {
      await db
        .update(emailOutbox)
        .set({ status: 'FAILED', lastError: error.slice(0, 300), attempts, updatedAt: at })
        .where(eq(emailOutbox.id, id));
    },

    async markSuppressed(id: string, reason: string, at: string): Promise<void> {
      await db
        .update(emailOutbox)
        .set({ status: 'SUPPRESSED', lastError: reason.slice(0, 300), updatedAt: at })
        .where(eq(emailOutbox.id, id));
    },

    async countByStatus(status: EmailDeliveryStatus): Promise<number> {
      const rows = await db
        .select({ value: sql<number>`count(*)` })
        .from(emailOutbox)
        .where(eq(emailOutbox.status, status));

      return Number(rows[0]?.value ?? 0);
    },

    async countFailed(): Promise<number> {
      const rows = await db
        .select({ value: sql<number>`count(*)` })
        .from(emailOutbox)
        .where(eq(emailOutbox.status, 'FAILED'));

      return Number(rows[0]?.value ?? 0);
    },

    async listRecent(limit: number): Promise<EmailOutboxRow[]> {
      return db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(limit);
    },

    async list(filter: EmailOutboxFilter): Promise<EmailOutboxPage> {
      const conditions: SQL[] = [];
      if (filter.status) conditions.push(eq(emailOutbox.status, filter.status));
      if (filter.kind) conditions.push(eq(emailOutbox.kind, filter.kind));
      if (filter.to) conditions.push(like(emailOutbox.to, `%${filter.to.trim()}%`));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [rows, total] = await Promise.all([
        db
          .select()
          .from(emailOutbox)
          .where(where)
          .orderBy(desc(emailOutbox.createdAt))
          .limit(filter.size)
          .offset((filter.page - 1) * filter.size),
        db
          .select({ value: sql<number>`count(*)` })
          .from(emailOutbox)
          .where(where)
          .then((result) => Number(result[0]?.value ?? 0)),
      ]);

      return { rows, total };
    },

    /**
     * Reminder de-duplication without a reminder-state table (email spec §10.1):
     * the last reminder for this report is the newest sent row whose payload
     * names it. Report ids are UUIDs, so the quote-delimited match is exact.
     */
    async lastSentFor(kind: string, reportId: string): Promise<string | null> {
      const rows = await db
        .select({ createdAt: emailOutbox.createdAt })
        .from(emailOutbox)
        .where(
          and(
            eq(emailOutbox.kind, kind),
            eq(emailOutbox.status, 'SENT'),
            like(emailOutbox.payload, `%"reportId":"${reportId}"%`),
          ),
        )
        .orderBy(desc(emailOutbox.createdAt))
        .limit(1);

      return rows[0]?.createdAt ?? null;
    },
  };
}

export type EmailOutboxQueries = ReturnType<typeof createEmailOutboxQueries>;

import { asc, desc, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { receipts, reports, type ReceiptRow } from '../schema/reports';

/** A receipt with the activity it belongs to, for the recipient's own history. */
export interface ReceiptWithReport {
  id: string;
  reportId: string;
  recipientName: string;
  generatedAt: string;
  emailedAt: string | null;
  referenceNo: string;
  title: string;
}

/** One generated OVPCASSS-F-013 receipt per PIC (spec §10). */
export function createReceiptQueries(db: Database) {
  return {
    async listForReport(reportId: string): Promise<ReceiptRow[]> {
      return db
        .select()
        .from(receipts)
        .where(eq(receipts.reportId, reportId))
        .orderBy(asc(receipts.recipientName));
    },

    /**
     * Every receipt issued to one account, newest first (spec §10). Scoped by
     * `recipient_user_id`, never by a client-supplied identity.
     */
    async listForRecipient(userId: string): Promise<ReceiptWithReport[]> {
      return db
        .select({
          id: receipts.id,
          reportId: receipts.reportId,
          recipientName: receipts.recipientName,
          generatedAt: receipts.generatedAt,
          emailedAt: receipts.emailedAt,
          referenceNo: reports.referenceNo,
          title: reports.title,
        })
        .from(receipts)
        .innerJoin(reports, eq(reports.id, receipts.reportId))
        .where(eq(receipts.recipientUserId, userId))
        .orderBy(desc(receipts.generatedAt));
    },

    async findById(id: string): Promise<ReceiptRow | null> {
      const rows = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async save(input: {
      id: string;
      reportId: string;
      recipientPicId: string;
      recipientUserId: string | null;
      recipientName: string;
      objectKey: string;
      now: string;
    }): Promise<ReceiptRow> {
      const rows = await db
        .insert(receipts)
        .values({
          id: input.id,
          reportId: input.reportId,
          recipientPicId: input.recipientPicId,
          recipientUserId: input.recipientUserId,
          recipientName: input.recipientName,
          objectKey: input.objectKey,
          generatedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [receipts.reportId, receipts.recipientPicId],
          set: {
            objectKey: input.objectKey,
            recipientName: input.recipientName,
            recipientUserId: input.recipientUserId,
            generatedAt: input.now,
            updatedAt: input.now,
          },
        })
        .returning();

      const row = rows[0];
      if (!row) throw new Error('The receipt row was not written');
      return row;
    },

    async markEmailed(id: string, at: string): Promise<void> {
      await db.update(receipts).set({ emailedAt: at, updatedAt: at }).where(eq(receipts.id, id));
    },
  };
}

export type ReceiptQueries = ReturnType<typeof createReceiptQueries>;

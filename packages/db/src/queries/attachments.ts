import { and, eq, inArray, lt } from 'drizzle-orm';

import type { Database } from '../client';
import { attachments, type AttachmentRow } from '../schema/reports';

/**
 * Attachment rows (spec §7.8). Presign writes a PENDING row with the server's
 * object key; confirm flips it to CONFIRMED once the object exists; delete is a
 * soft transition so the audit trail and the uploader can still name the file.
 */
export function createAttachmentQueries(db: Database) {
  return {
    async insertPending(row: {
      id: string;
      reportId: string;
      originalName: string;
      objectKey: string;
      size: number;
      mimeType: string;
      uploadedByUserId: string;
      now: string;
    }): Promise<AttachmentRow> {
      const rows = await db
        .insert(attachments)
        .values({
          id: row.id,
          reportId: row.reportId,
          label: '',
          originalName: row.originalName,
          objectKey: row.objectKey,
          size: row.size,
          mimeType: row.mimeType,
          sha256: null,
          status: 'PENDING',
          uploadedByUserId: row.uploadedByUserId,
          createdAt: row.now,
          updatedAt: row.now,
        })
        .returning();

      const created = rows[0];
      if (!created) throw new Error('The attachment row was not created');
      return created;
    },

    async findById(reportId: string, id: string): Promise<AttachmentRow | null> {
      const rows = await db
        .select()
        .from(attachments)
        .where(and(eq(attachments.id, id), eq(attachments.reportId, reportId)))
        .limit(1);

      return rows[0] ?? null;
    },

    async confirm(
      id: string,
      input: { label?: string; sha256?: string | null; now: string },
    ): Promise<AttachmentRow | null> {
      const rows = await db
        .update(attachments)
        .set({
          status: 'CONFIRMED',
          ...(input.label === undefined ? {} : { label: input.label }),
          sha256: input.sha256 ?? null,
          updatedAt: input.now,
        })
        .where(and(eq(attachments.id, id), eq(attachments.status, 'PENDING')))
        .returning();

      return rows[0] ?? null;
    },

    async rename(id: string, label: string, now: string): Promise<AttachmentRow | null> {
      const rows = await db
        .update(attachments)
        .set({ label, updatedAt: now })
        .where(eq(attachments.id, id))
        .returning();

      return rows[0] ?? null;
    },

    /** Soft delete: the row stays for the audit trail, the uploader hides it. */
    async softDelete(id: string, now: string): Promise<AttachmentRow | null> {
      const rows = await db
        .update(attachments)
        .set({ status: 'DELETED', updatedAt: now })
        .where(eq(attachments.id, id))
        .returning();

      return rows[0] ?? null;
    },

    async countPending(reportId: string): Promise<number> {
      const rows = await db
        .select({ id: attachments.id })
        .from(attachments)
        .where(and(eq(attachments.reportId, reportId), eq(attachments.status, 'PENDING')));

      return rows.length;
    },

    /**
     * Cleanup cron (spec §7.8): a presigned upload never confirmed within a day
     * is an orphan. The object exists in R2 but no report counts it.
     */
    async listOrphanedPending(before: string): Promise<AttachmentRow[]> {
      return db
        .select()
        .from(attachments)
        .where(and(eq(attachments.status, 'PENDING'), lt(attachments.createdAt, before)));
    },

    async listConfirmed(reportId: string): Promise<AttachmentRow[]> {
      return db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.reportId, reportId),
            inArray(attachments.status, ['PENDING', 'CONFIRMED']),
          ),
        );
    },
  };
}

export type AttachmentQueries = ReturnType<typeof createAttachmentQueries>;

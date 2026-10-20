import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { acknowledgements, type AcknowledgementRow } from '../schema/reports';

/** The generated approval PDF, one row per report (spec §7.10). */
export function createAcknowledgementQueries(db: Database) {
  return {
    async findByReport(reportId: string): Promise<AcknowledgementRow | null> {
      const rows = await db
        .select()
        .from(acknowledgements)
        .where(eq(acknowledgements.reportId, reportId))
        .limit(1);

      return rows[0] ?? null;
    },

    async save(input: {
      id: string;
      reportId: string;
      objectKey: string;
      now: string;
    }): Promise<AcknowledgementRow> {
      const rows = await db
        .insert(acknowledgements)
        .values({
          id: input.id,
          reportId: input.reportId,
          objectKey: input.objectKey,
          generatedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: acknowledgements.reportId,
          set: { objectKey: input.objectKey, generatedAt: input.now, updatedAt: input.now },
        })
        .returning();

      const row = rows[0];
      if (!row) throw new Error('The acknowledgement row was not written');
      return row;
    },
  };
}

export type AcknowledgementQueries = ReturnType<typeof createAcknowledgementQueries>;

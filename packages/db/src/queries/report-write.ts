import type { ReportActivityInput, ReportStatus } from '@par/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../client';
import {
  attachments,
  receipts,
  referenceCounters,
  reportComments,
  reportPics,
  reports,
  reportSdgs,
  type NewReportRow,
  type ReportRow,
} from '../schema/reports';

/** A PIC as the admin supplied it, after account provisioning. */
export interface PicAssignment {
  id?: string | undefined;
  userId?: string | null | undefined;
  name: string;
  email: string;
  phone?: string | null | undefined;
  invitedAt?: string | null | undefined;
}

export interface StatusChange {
  to: ReportStatus;
  /** States the transition may start from; anything else affects no row. */
  from: readonly ReportStatus[];
  version?: number;
  patch?: Partial<NewReportRow>;
}

export interface ReportCommentInput {
  id: string;
  reportId: string;
  authorUserId: string;
  kind: 'RETURN' | 'OFFICE_NOTE';
  round: number;
  body: string;
  createdAt: string;
}

type ActivityProjection = Pick<
  NewReportRow,
  | 'type'
  | 'classification'
  | 'campusId'
  | 'unitId'
  | 'department'
  | 'office'
  | 'level'
  | 'title'
  | 'activityStartDate'
  | 'activityEndDate'
  | 'location'
  | 'activityCount'
  | 'totalStudents'
  | 'totalPic'
>;

function projection(form: ReportActivityInput): ActivityProjection {
  return {
    type: form.type,
    classification: form.classification,
    campusId: form.campusId,
    unitId: form.unitId,
    department: form.department ?? null,
    office: form.office ?? null,
    level: form.level,
    title: form.title,
    activityStartDate: form.activityStartDate,
    activityEndDate: form.activityEndDate,
    location: form.location,
    activityCount: form.activityCount,
    totalStudents: form.totalStudents,
    totalPic: form.totalPic,
  };
}

export function createReportWriteQueries(db: Database) {
  return {
    /** Global AR counter (spec §5). Gaps are allowed and never repaired. */
    async nextReferenceSequence(): Promise<number> {
      const rows = await db
        .insert(referenceCounters)
        .values({ name: 'AR', lastSeq: 1 })
        .onConflictDoUpdate({
          target: referenceCounters.name,
          set: { lastSeq: sql`${referenceCounters.lastSeq} + 1` },
        })
        .returning({ lastSeq: referenceCounters.lastSeq });

      return rows[0]?.lastSeq ?? 1;
    },

    async insertRecord(input: {
      id: string;
      referenceNo: string;
      sequence: number;
      createdByUserId: string;
      form: ReportActivityInput;
      now: string;
    }): Promise<ReportRow> {
      const rows = await db
        .insert(reports)
        .values({
          ...projection(input.form),
          id: input.id,
          referenceNo: input.referenceNo,
          sequence: input.sequence,
          status: 'DRAFT',
          version: 0,
          createdByUserId: input.createdByUserId,
          narrative: '',
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();

      const row = rows[0];
      if (!row) throw new Error('The record was not created');
      return row;
    },

    /** Activity edits stay on the same row and never touch the narrative. */
    async updateRecord(input: {
      id: string;
      form: ReportActivityInput;
      now: string;
      version?: number;
      from: readonly ReportStatus[];
    }): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({
          ...projection(input.form),
          version: sql`${reports.version} + 1`,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(reports.id, input.id),
            inArray(reports.status, input.from),
            input.version === undefined ? undefined : eq(reports.version, input.version),
          ),
        )
        .returning();

      return rows[0] ?? null;
    },

    async changeStatus(
      id: string,
      change: StatusChange & { now: string },
    ): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({
          ...change.patch,
          status: change.to,
          version: sql`${reports.version} + 1`,
          updatedAt: change.now,
        })
        .where(
          and(
            eq(reports.id, id),
            inArray(reports.status, change.from),
            change.version === undefined ? undefined : eq(reports.version, change.version),
          ),
        )
        .returning();

      return rows[0] ?? null;
    },

    async setNarrative(input: {
      id: string;
      narrative: string;
      now: string;
      version?: number;
      from: readonly ReportStatus[];
    }): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({
          narrative: input.narrative,
          version: sql`${reports.version} + 1`,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(reports.id, input.id),
            inArray(reports.status, input.from),
            input.version === undefined ? undefined : eq(reports.version, input.version),
          ),
        )
        .returning();

      return rows[0] ?? null;
    },

    /** SDGs and PICs are replaced as a set, matching the form's lists. */
    async replaceLists(
      reportId: string,
      sdgIds: readonly string[],
      pics: readonly PicAssignment[],
    ): Promise<void> {
      await db.delete(reportSdgs).where(eq(reportSdgs.reportId, reportId));
      if (sdgIds.length > 0) {
        await db.insert(reportSdgs).values(sdgIds.map((sdgId) => ({ reportId, sdgId })));
      }

      await db.delete(reportPics).where(eq(reportPics.reportId, reportId));
      if (pics.length > 0) {
        await db.insert(reportPics).values(
          pics.map((pic, index) => ({
            id: pic.id ?? crypto.randomUUID(),
            reportId,
            userId: pic.userId ?? null,
            name: pic.name,
            email: pic.email.toLowerCase(),
            phone: pic.phone ?? null,
            sortOrder: index,
            invitedAt: pic.invitedAt ?? null,
          })),
        );
      }
    },

    /**
     * The PIC's snapshotted signature. The report version is untouched: signing
     * is not a content edit, so it must not invalidate a client's `If-Match`.
     * `cleared` records the deliberate "no signature" state, so the submit
     * snapshot does not sign the record again (bug phase 05 §7).
     */
    async setSignature(
      id: string,
      input: { key: string | null; signedAt: string | null; cleared: boolean; now: string },
    ): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({
          narrativeSignatureKey: input.key,
          narrativeSignedAt: input.signedAt,
          narrativeSignatureCleared: input.cleared,
          updatedAt: input.now,
        })
        .where(eq(reports.id, id))
        .returning();

      return rows[0] ?? null;
    },

    async insertComment(input: ReportCommentInput): Promise<void> {
      await db.insert(reportComments).values(input);
    },

    async countReturns(reportId: string): Promise<number> {
      const rows = await db
        .select({ value: sql<number>`count(*)` })
        .from(reportComments)
        .where(and(eq(reportComments.reportId, reportId), eq(reportComments.kind, 'RETURN')));

      return Number(rows[0]?.value ?? 0);
    },

    /** Only an unsubmitted draft is deletable; its AR No. is retired. */
    async deleteRecord(id: string): Promise<string | null> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.id, id), eq(reports.status, 'DRAFT')))
        .limit(1);

      if (!rows[0]) return null;

      await db.delete(reportSdgs).where(eq(reportSdgs.reportId, id));
      await db.delete(reportPics).where(eq(reportPics.reportId, id));
      await db.delete(reportComments).where(eq(reportComments.reportId, id));
      await db.delete(attachments).where(eq(attachments.reportId, id));
      await db.delete(receipts).where(eq(receipts.reportId, id));
      await db.delete(reports).where(eq(reports.id, id));

      return id;
    },
  };
}

export type ReportWriteQueries = ReturnType<typeof createReportWriteQueries>;

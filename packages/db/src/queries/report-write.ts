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
    campusId: form.campusId ?? null,
    unitId: form.unitId ?? null,
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

/**
 * One deploy window may still hold rows written as `DRAFT`. Reads normalise them
 * to `PENDING`, so writes must accept both spellings or a save would 409 against
 * a record the reader was just shown (spec §15.2).
 */
function statusWhere(from: readonly ReportStatus[]): ReportStatus[] {
  return from.includes('PENDING') ? [...from, 'DRAFT' as unknown as ReportStatus] : [...from];
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
          status: 'PENDING',
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
            inArray(reports.status, statusWhere(input.from)),
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
            inArray(reports.status, statusWhere(change.from)),
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
            inArray(reports.status, statusWhere(input.from)),
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
     * A PIC who claims an activity by submitting its narrative (spec §5). The
     * account is appended once; a second submission by the same address keeps
     * the existing row, so the receipt goes out exactly once.
     */
    async addPic(input: {
      reportId: string;
      userId: string;
      name: string;
      email: string;
      now: string;
    }): Promise<void> {
      const existing = await db
        .select({ sortOrder: reportPics.sortOrder })
        .from(reportPics)
        .where(eq(reportPics.reportId, input.reportId));
      const next = existing.reduce((highest, row) => Math.max(highest, row.sortOrder + 1), 0);

      await db
        .insert(reportPics)
        .values({
          id: crypto.randomUUID(),
          reportId: input.reportId,
          userId: input.userId,
          name: input.name,
          email: input.email.toLowerCase(),
          sortOrder: next,
          invitedAt: input.now,
        })
        .onConflictDoNothing({ target: [reportPics.reportId, reportPics.email] });
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

    /** A filing flag on an approved record; the status never moves. */
    async setArchived(
      id: string,
      input: { archivedAt: string | null; archivedByUserId: string | null },
    ): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({ archivedAt: input.archivedAt, archivedByUserId: input.archivedByUserId })
        .where(and(eq(reports.id, id), eq(reports.status, 'APPROVED')))
        .returning();

      return rows[0] ?? null;
    },

    /**
     * The office's Date Completed (spec §7.13). It never rewrites `approved_at`,
     * so the F-013 receipt and the facsimile keep the day they were decided.
     * `null` clears it and the sheet falls back to the approval date.
     */
    async setCompletedOn(input: {
      id: string;
      completedOn: string | null;
      now: string;
      version?: number;
    }): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({
          completedOn: input.completedOn,
          version: sql`${reports.version} + 1`,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(reports.id, input.id),
            eq(reports.status, 'APPROVED'),
            input.version === undefined ? undefined : eq(reports.version, input.version),
          ),
        )
        .returning();

      return rows[0] ?? null;
    },

    async countReturns(reportId: string): Promise<number> {
      const rows = await db
        .select({ value: sql<number>`count(*)` })
        .from(reportComments)
        .where(and(eq(reportComments.reportId, reportId), eq(reportComments.kind, 'RETURN')));

      return Number(rows[0]?.value ?? 0);
    },

    /** Only an unsubmitted record is deletable; its AR No. is retired. */
    async deleteRecord(id: string): Promise<string | null> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.id, id), inArray(reports.status, statusWhere(['PENDING']))))
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

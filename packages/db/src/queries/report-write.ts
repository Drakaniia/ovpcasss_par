import type { Classification, Level, ReportDraftForm, ReportStatus, ReportType } from '@par/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../client';
import {
  attachments,
  reportComments,
  reportPics,
  reports,
  reportSdgs,
  trackingCounters,
  type NewReportRow,
  type ReportCommentKind,
  type ReportRow,
} from '../schema/reports';

/**
 * Draft persistence and workflow writes (spec §7.5-§7.7). A server draft is a
 * real report row: its columns are the projection the tables read, while the
 * exact partial input stays in `draft_form` so no empty field is invented.
 */
export interface DraftPicture {
  name: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
}

/**
 * A value a draft has not supplied yet. The column is NOT NULL because a
 * submitted report always has it; a draft simply reads the placeholder back.
 */
const DRAFT_DEFAULTS = {
  type: 'IN_CAMPUS',
  classification: 'NON_CURRICULAR',
  level: 'UNDERGRADUATE',
} as const;

export interface ReportProjection {
  type: ReportType;
  classification: Classification;
  campusId: string;
  unitId: string;
  department: string | null;
  office: string | null;
  level: Level;
  title: string;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  totalStudents: number;
  totalPic: number;
  narrative: string;
  draftForm: string;
  updatedAt: string;
}

export function projectReportForm(form: ReportDraftForm, now: string): ReportProjection {
  return {
    type: form.type ?? DRAFT_DEFAULTS.type,
    classification: form.classification ?? DRAFT_DEFAULTS.classification,
    campusId: form.campusId ?? '',
    unitId: form.unitId ?? '',
    department: form.department ?? null,
    office: form.office ?? null,
    level: form.level ?? DRAFT_DEFAULTS.level,
    title: form.title ?? '',
    activityStartDate: form.activityStartDate ?? '',
    activityEndDate: form.activityEndDate ?? '',
    location: form.location ?? '',
    totalStudents: form.totalStudents ?? 0,
    totalPic: form.totalPic ?? 0,
    narrative: form.narrative ?? '',
    draftForm: JSON.stringify(form),
    updatedAt: now,
  };
}

function draftValues(form: ReportDraftForm, now: string): ReportProjection {
  return projectReportForm(form, now);
}

export interface StatusChange {
  to: ReportStatus;
  /** States the transition may start from; anything else affects no row. */
  from: readonly ReportStatus[];
  /** Optimistic concurrency, from `If-Match`. */
  version?: number;
  patch?: Partial<NewReportRow>;
}

export interface ReportCommentInput {
  id: string;
  reportId: string;
  authorUserId: string;
  kind: ReportCommentKind;
  round: number;
  body: string;
  createdAt: string;
}

export function createReportWriteQueries(db: Database) {
  return {
    async insertDraft(input: {
      id: string;
      ownerUserId: string;
      form: ReportDraftForm;
      now: string;
    }): Promise<ReportRow> {
      const rows = await db
        .insert(reports)
        .values({
          ...draftValues(input.form, input.now),
          id: input.id,
          status: 'DRAFT',
          version: 0,
          ownerUserId: input.ownerUserId,
          submittedAt: null,
          endorsedAt: null,
          approvedAt: null,
          approvedByUserId: null,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();

      const row = rows[0];
      if (!row) throw new Error('The draft was not created');
      return row;
    },

    /** Edits stay on the same row; a stale version touches no row. */
    async updateDraft(input: {
      id: string;
      form: ReportDraftForm;
      now: string;
      version?: number;
      from?: readonly ReportStatus[];
    }): Promise<ReportRow | null> {
      const rows = await db
        .update(reports)
        .set({
          ...draftValues(input.form, input.now),
          version: sql`${reports.version} + 1`,
        })
        .where(
          and(
            eq(reports.id, input.id),
            input.version === undefined ? undefined : eq(reports.version, input.version),
            input.from === undefined ? undefined : inArray(reports.status, input.from),
          ),
        )
        .returning();

      return rows[0] ?? null;
    },

    /** One guarded status change; the state machine is enforced by the caller. */
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

    /** Atomic per-prefix/year sequence (spec §7.7); returns the issued number. */
    async nextTrackingSequence(prefix: string, year: number): Promise<number> {
      const rows = await db
        .insert(trackingCounters)
        .values({ prefix, year, lastSeq: 1 })
        .onConflictDoUpdate({
          target: [trackingCounters.prefix, trackingCounters.year],
          set: { lastSeq: sql`${trackingCounters.lastSeq} + 1` },
        })
        .returning({ lastSeq: trackingCounters.lastSeq });

      return rows[0]?.lastSeq ?? 1;
    },

    /** SDGs and PICs are replaced as a set, matching the form's multi-selects. */
    async replaceLists(
      reportId: string,
      sdgIds: readonly string[],
      pics: readonly DraftPicture[],
    ): Promise<void> {
      await db.delete(reportSdgs).where(eq(reportSdgs.reportId, reportId));
      if (sdgIds.length > 0) {
        await db.insert(reportSdgs).values(sdgIds.map((sdgId) => ({ reportId, sdgId })));
      }

      await db.delete(reportPics).where(eq(reportPics.reportId, reportId));
      if (pics.length > 0) {
        await db.insert(reportPics).values(
          pics.map((pic, index) => ({
            id: crypto.randomUUID(),
            reportId,
            name: pic.name,
            email: pic.email ?? null,
            phone: pic.phone ?? null,
            sortOrder: index,
          })),
        );
      }
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

    /** Only a draft is deletable; a submitted report is never removed. */
    async deleteDraft(id: string): Promise<string | null> {
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
      await db.delete(reports).where(eq(reports.id, id));

      return id;
    },
  };
}

export type ReportWriteQueries = ReturnType<typeof createReportWriteQueries>;

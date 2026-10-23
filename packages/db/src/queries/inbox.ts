import type { ReportStatus, ReportType } from '@par/shared';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../client';
import { auditEvents } from '../schema/operations';
import { reportPics, reports } from '../schema/reports';

/** Home section reads (spec §12). Each returns its true total plus at most `limit` rows. */

export interface InboxReportRow {
  id: string;
  referenceNo: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  updatedAt: string;
  submittedAt: string | null;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
}

export interface InboxSectionPage {
  total: number;
  rows: InboxReportRow[];
}

export interface InboxEventRow {
  id: string;
  reportId: string;
  referenceNo: string;
  title: string;
  action: string;
  occurredAt: string;
}

/** Report events that reach the home activity rail. */
export const INBOX_ACTIONS = [
  'NARRATIVE_SUBMITTED',
  'NARRATIVE_RETURNED',
  'NARRATIVE_APPROVED',
] as const;

const DECISION_ACTIONS = ['NARRATIVE_APPROVED', 'NARRATIVE_RETURNED'] as const;

function reportColumns() {
  return {
    id: reports.id,
    referenceNo: reports.referenceNo,
    title: reports.title,
    type: reports.type,
    status: reports.status,
    updatedAt: reports.updatedAt,
    submittedAt: reports.submittedAt,
    activityStartDate: reports.activityStartDate,
    activityEndDate: reports.activityEndDate,
    location: reports.location,
  };
}

export function createInboxQueries(db: Database) {
  function memberOf(userId: string) {
    return inArray(
      reports.id,
      db.select({ id: reportPics.reportId }).from(reportPics).where(eq(reportPics.userId, userId)),
    );
  }

  async function section(
    where: SQL | undefined,
    order: SQL,
    limit: number,
  ): Promise<InboxSectionPage> {
    const [rows, total] = await Promise.all([
      db.select(reportColumns()).from(reports).where(where).orderBy(order).limit(limit),
      db
        .select({ value: sql<number>`count(*)` })
        .from(reports)
        .where(where)
        .then((result) => Number(result[0]?.value ?? 0)),
    ]);

    return { total, rows };
  }

  async function events(where: SQL | undefined, limit: number): Promise<InboxEventRow[]> {
    return db
      .select({
        id: auditEvents.id,
        reportId: reports.id,
        referenceNo: reports.referenceNo,
        title: reports.title,
        action: auditEvents.action,
        occurredAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .innerJoin(reports, eq(auditEvents.entityId, reports.id))
      .where(where)
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit);
  }

  return {
    /** Narratives waiting on the office, oldest submission first. */
    awaitingReview(limit = 3) {
      return section(eq(reports.status, 'SUBMITTED'), asc(reports.submittedAt), limit);
    },

    /** Records created but not yet submitted by their PICs. */
    withPic(limit = 3) {
      return section(eq(reports.status, 'DRAFT'), desc(reports.updatedAt), limit);
    },

    /** Returned to the reader's own records. */
    returned(userId: string, limit = 3, isAdmin = false) {
      return section(
        and(eq(reports.status, 'RETURNED'), isAdmin ? undefined : memberOf(userId)),
        desc(reports.updatedAt),
        limit,
      );
    },

    approved(userId: string, limit = 3, isAdmin = false) {
      return section(
        and(eq(reports.status, 'APPROVED'), isAdmin ? undefined : memberOf(userId)),
        desc(reports.approvedAt),
        limit,
      );
    },

    /** Every record assigned to the reader, newest first. */
    myReports(userId: string, limit = 3) {
      return section(memberOf(userId), desc(reports.updatedAt), limit);
    },

    async hasSubmitted(userId: string): Promise<boolean> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.submittedByUserId, userId), sql`${reports.submittedAt} is not null`))
        .limit(1);

      return rows.length > 0;
    },

    async firstDraftId(userId: string): Promise<string | null> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.status, 'DRAFT'), memberOf(userId)))
        .orderBy(desc(reports.updatedAt))
        .limit(1);

      return rows[0]?.id ?? null;
    },

    /** Events on the reader's records (or the whole office for an admin). */
    activity(userId: string, limit = 5, isAdmin = false) {
      return events(
        and(
          eq(auditEvents.entityType, 'report'),
          inArray(auditEvents.action, [...INBOX_ACTIONS]),
          isAdmin ? undefined : memberOf(userId),
        ),
        limit,
      );
    },

    /** Decisions the caller recorded, newest first. */
    recentlyDecided(userId: string, limit = 3) {
      return events(
        and(
          eq(auditEvents.entityType, 'report'),
          eq(auditEvents.actorUserId, userId),
          inArray(auditEvents.action, [...DECISION_ACTIONS]),
        ),
        limit,
      );
    },
  };
}

export type InboxQueries = ReturnType<typeof createInboxQueries>;

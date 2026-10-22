import type { ReportStatus, ReportType } from '@par/shared';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../client';
import { auditEvents } from '../schema/operations';
import { reports } from '../schema/reports';

/**
 * Work-inbox assembly reads (signature spec §6.1). Every section is one indexed
 * read that returns both its true total and at most `limit` rows, so the client
 * never counts what it received. Filters are the caller's own reports or the
 * queue statuses; the route decides which sections a role may see.
 */

export interface InboxReportRow {
  id: string;
  ownerUserId: string;
  trackingNumber: string | null;
  title: string;
  type: ReportType;
  status: ReportStatus;
  updatedAt: string;
  submittedAt: string | null;
  endorsedAt: string | null;
  /** Enough of the draft projection to estimate its completeness. */
  campusId: string;
  unitId: string;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  narrative: string;
}

export interface InboxSectionPage {
  total: number;
  rows: InboxReportRow[];
}

export interface InboxEventRow {
  id: string;
  reportId: string;
  trackingNumber: string | null;
  title: string;
  action: string;
  occurredAt: string;
}

export const RETURNED_STATUSES: readonly ReportStatus[] = [
  'RETURNED_BY_REVIEWER',
  'RETURNED_BY_APPROVER',
];
export const REVIEW_STATUSES: readonly ReportStatus[] = ['SUBMITTED', 'RESUBMITTED'];
export const APPROVAL_STATUSES: readonly ReportStatus[] = ['ENDORSED'];
export const WAITING_STATUSES: readonly ReportStatus[] = ['SUBMITTED', 'RESUBMITTED', 'ENDORSED'];

/** Report events that reach the inbox's recent activity and decided lists. */
export const INBOX_ACTIONS = [
  'SUBMITTED',
  'RESUBMITTED',
  'RETURNED_BY_REVIEWER',
  'RETURNED_BY_APPROVER',
  'ENDORSED',
  'APPROVED',
] as const;

const DECISION_ACTIONS = [
  'ENDORSED',
  'APPROVED',
  'RETURNED_BY_REVIEWER',
  'RETURNED_BY_APPROVER',
] as const;

function reportColumns() {
  return {
    id: reports.id,
    ownerUserId: reports.ownerUserId,
    trackingNumber: reports.trackingNumber,
    title: reports.title,
    type: reports.type,
    status: reports.status,
    updatedAt: reports.updatedAt,
    submittedAt: reports.submittedAt,
    endorsedAt: reports.endorsedAt,
    campusId: reports.campusId,
    unitId: reports.unitId,
    activityStartDate: reports.activityStartDate,
    activityEndDate: reports.activityEndDate,
    location: reports.location,
    narrative: reports.narrative,
  };
}

export function createInboxQueries(db: Database) {
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
        trackingNumber: reports.trackingNumber,
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
    /** Returned to the caller: edit them, newest change first. */
    returned(userId: string, limit = 3) {
      return section(
        and(eq(reports.ownerUserId, userId), inArray(reports.status, RETURNED_STATUSES)),
        desc(reports.updatedAt),
        limit,
      );
    },

    /** Oldest submission first, as the reviewer works through the backlog. */
    review(limit = 3) {
      return section(inArray(reports.status, REVIEW_STATUSES), asc(reports.submittedAt), limit);
    },

    approval(limit = 3) {
      return section(inArray(reports.status, APPROVAL_STATUSES), asc(reports.endorsedAt), limit);
    },

    drafts(userId: string, limit = 3) {
      return section(
        and(eq(reports.ownerUserId, userId), eq(reports.status, 'DRAFT')),
        desc(reports.updatedAt),
        limit,
      );
    },

    waiting(userId: string, limit = 3) {
      return section(
        and(eq(reports.ownerUserId, userId), inArray(reports.status, WAITING_STATUSES)),
        desc(reports.updatedAt),
        limit,
      );
    },

    async hasSubmitted(userId: string): Promise<boolean> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.ownerUserId, userId), sql`${reports.submittedAt} is not null`))
        .limit(1);

      return rows.length > 0;
    },

    async firstDraftId(userId: string): Promise<string | null> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.ownerUserId, userId), eq(reports.status, 'DRAFT')))
        .orderBy(desc(reports.updatedAt))
        .limit(1);

      return rows[0]?.id ?? null;
    },

    /** Events on the caller's own reports, newest first. */
    activity(userId: string, limit = 5) {
      return events(
        and(
          eq(auditEvents.entityType, 'report'),
          inArray(auditEvents.action, [...INBOX_ACTIONS]),
          eq(reports.ownerUserId, userId),
        ),
        limit,
      );
    },

    /** Decisions the caller recorded, newest first (spec §6.1 `recentlyDecided`). */
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

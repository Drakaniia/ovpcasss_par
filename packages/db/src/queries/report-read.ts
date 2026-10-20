import type {
  QueueFacets,
  QueueKind,
  QueueListQuery,
  QueueSort,
  ReportFilterOption,
  ReportListFacets,
  ReportListQuery,
  ReportStatus,
} from '@par/shared';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '../client';
import { users } from '../schema/identity';
import { refCampuses, refTerms, refUnits } from '../schema/reference-data';
import {
  attachments,
  reportComments,
  reportPics,
  reports,
  reportSdgs,
  type ReportRow,
} from '../schema/reports';

export interface ReportWithNames extends ReportRow {
  campusName: string | null;
  unitName: string | null;
}

export interface ReportListFilter extends ReportListQuery {
  /** The caller's own reports; My reports is own-only for every role. */
  ownerUserId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface CommentWithAuthor {
  id: string;
  kind: 'RETURN' | 'REVIEW_NOTE' | 'APPROVER_NOTE';
  round: number;
  body: string;
  createdAt: string;
  authorUserId: string;
  authorName: string;
  authorRole: 'SUBMITTER' | 'REVIEWER' | 'APPROVER' | 'ADMIN' | null;
}

export interface ReportListPage {
  rows: ReportRow[];
  total: number;
}

export interface QueuePage {
  rows: (ReportRow & {
    submitterName: string;
    unitName: string | null;
    pendingAttachments: boolean;
  })[];
  total: number;
  oldestWaitingAt: string | null;
  facets: QueueFacets;
}

const SEMESTER_LABELS: Record<string, string> = {
  '1': '1st Semester',
  '2': '2nd Semester',
  SUMMER: 'Summer',
};

const TAB_STATUSES: Record<Exclude<ReportListQuery['tab'], 'all'>, readonly ReportStatus[]> = {
  drafts: ['DRAFT'],
  returned: ['RETURNED_BY_REVIEWER', 'RETURNED_BY_APPROVER'],
  approved: ['APPROVED'],
};

const QUEUE_STATUSES: Record<QueueKind, readonly ReportStatus[]> = {
  review: ['SUBMITTED', 'RESUBMITTED'],
  approval: ['ENDORSED'],
};

function option(id: string, label: string, isActive: boolean): ReportFilterOption {
  return { id, label, isActive };
}

function reportSort(query: ReportListQuery) {
  const direction = query.dir === 'asc' ? asc : desc;

  switch (query.sort) {
    case 'trackingNumber':
      return direction(reports.trackingNumber);
    case 'activityDate':
      return direction(reports.activityStartDate);
    case 'status':
      return direction(reports.status);
    case 'updated':
      return direction(reports.updatedAt);
  }
}

function queueSort(sort: QueueSort, kind: QueueKind) {
  const column = kind === 'review' ? reports.submittedAt : reports.endorsedAt;
  return sort === 'newest' ? desc(column) : asc(column);
}

/** Like patterns are escaped so a user's `%` stays a literal character. */
export function likePattern(term: string): string {
  return `%${term.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
}

export function createReportReadQueries(db: Database) {
  async function campusOptions(): Promise<ReportFilterOption[]> {
    const rows = await db
      .select()
      .from(refCampuses)
      .where(isNull(refCampuses.deletedAt))
      .orderBy(asc(refCampuses.sortOrder), asc(refCampuses.name));

    return rows.map((row) => option(row.id, row.name, row.isActive));
  }

  async function termOptions(): Promise<ReportFilterOption[]> {
    const rows = await db
      .select()
      .from(refTerms)
      .where(isNull(refTerms.deletedAt))
      .orderBy(desc(refTerms.schoolYear), desc(refTerms.semester));

    return rows.map((row) =>
      option(
        row.id,
        `${SEMESTER_LABELS[row.semester] ?? row.semester} \u00b7 SY ${row.schoolYear}`,
        row.isActive,
      ),
    );
  }

  return {
    async findById(id: string): Promise<ReportRow | null> {
      const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async findWithNames(id: string): Promise<ReportWithNames | null> {
      const rows = await db
        .select({
          report: reports,
          campusName: refCampuses.name,
          unitName: refUnits.name,
        })
        .from(reports)
        .leftJoin(refCampuses, eq(reports.campusId, refCampuses.id))
        .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
        .where(eq(reports.id, id))
        .limit(1);

      const row = rows[0];
      return row ? { ...row.report, campusName: row.campusName, unitName: row.unitName } : null;
    },

    async findTerm(id: string) {
      const rows = await db.select().from(refTerms).where(eq(refTerms.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async list(filter: ReportListFilter): Promise<ReportListPage> {
      const conditions: SQL[] = [];

      if (filter.ownerUserId) conditions.push(eq(reports.ownerUserId, filter.ownerUserId));
      if (filter.tab !== 'all') conditions.push(inArray(reports.status, TAB_STATUSES[filter.tab]));
      if (filter.type) conditions.push(eq(reports.type, filter.type));
      if (filter.campus) conditions.push(eq(reports.campusId, filter.campus));
      if (filter.from) conditions.push(gte(reports.activityStartDate, filter.from));
      if (filter.to) conditions.push(lte(reports.activityStartDate, filter.to));
      if (filter.q) {
        const term = likePattern(filter.q);
        conditions.push(or(like(reports.title, term), like(reports.trackingNumber, term))!);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [rows, total] = await Promise.all([
        db
          .select()
          .from(reports)
          .where(where)
          .orderBy(reportSort(filter))
          .limit(filter.size)
          .offset((filter.page - 1) * filter.size),
        db
          .select({ value: sql<number>`count(*)` })
          .from(reports)
          .where(where)
          .then((result) => Number(result[0]?.value ?? 0)),
      ]);

      return { rows, total };
    },

    async listFacets(): Promise<ReportListFacets> {
      const [campuses, terms] = await Promise.all([campusOptions(), termOptions()]);
      return { campuses, terms };
    },

    async queue(kind: QueueKind, query: QueueListQuery): Promise<QueuePage> {
      const conditions: SQL[] = [inArray(reports.status, QUEUE_STATUSES[kind])];
      if (query.type) conditions.push(eq(reports.type, query.type));
      if (query.campus) conditions.push(eq(reports.campusId, query.campus));
      if (query.college) conditions.push(eq(reports.unitId, query.college));

      const where = and(...conditions);
      const [rows, total, oldest, campuses, colleges] = await Promise.all([
        db
          .select({
            report: reports,
            submitterName: users.fullName,
            unitName: refUnits.name,
          })
          .from(reports)
          .leftJoin(users, eq(reports.ownerUserId, users.id))
          .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
          .where(where)
          .orderBy(queueSort(query.sort, kind))
          .limit(query.size)
          .offset((query.page - 1) * query.size),
        db
          .select({ value: sql<number>`count(*)` })
          .from(reports)
          .where(where)
          .then((result) => Number(result[0]?.value ?? 0)),
        kind === 'review'
          ? db
              .select({ value: reports.submittedAt })
              .from(reports)
              .where(where)
              .orderBy(asc(reports.submittedAt))
              .limit(1)
          : db
              .select({ value: reports.endorsedAt })
              .from(reports)
              .where(where)
              .orderBy(asc(reports.endorsedAt))
              .limit(1),
        campusOptions(),
        db
          .select()
          .from(refUnits)
          .where(isNull(refUnits.deletedAt))
          .orderBy(asc(refUnits.sortOrder), asc(refUnits.name))
          .then((units) => units.map((unit) => option(unit.id, unit.name, unit.isActive))),
      ]);

      const pending = await pendingAttachmentReports(rows.map((row) => row.report.id));

      return {
        rows: rows.map((row) => ({
          ...row.report,
          submitterName: row.submitterName ?? '',
          unitName: row.unitName,
          pendingAttachments: pending.has(row.report.id),
        })),
        total,
        oldestWaitingAt: oldest[0]?.value ?? null,
        facets: { campuses, colleges },
      };
    },

    async listAttachments(reportId: string) {
      return db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.reportId, reportId),
            inArray(attachments.status, ['PENDING', 'CONFIRMED']),
          ),
        )
        .orderBy(asc(attachments.createdAt));
    },

    async listPics(reportId: string) {
      return db
        .select()
        .from(reportPics)
        .where(eq(reportPics.reportId, reportId))
        .orderBy(asc(reportPics.sortOrder));
    },

    async listSdgIds(reportId: string): Promise<string[]> {
      const rows = await db
        .select({ sdgId: reportSdgs.sdgId })
        .from(reportSdgs)
        .where(eq(reportSdgs.reportId, reportId));
      return rows.map((row) => row.sdgId);
    },

    async listComments(reportId: string): Promise<CommentWithAuthor[]> {
      const rows = await db
        .select({
          comment: reportComments,
          authorName: users.fullName,
          authorRole: users.role,
        })
        .from(reportComments)
        .leftJoin(users, eq(reportComments.authorUserId, users.id))
        .where(eq(reportComments.reportId, reportId))
        .orderBy(asc(reportComments.createdAt));

      return rows.map((row) => ({
        id: row.comment.id,
        kind: row.comment.kind,
        round: row.comment.round,
        body: row.comment.body,
        createdAt: row.comment.createdAt,
        authorUserId: row.comment.authorUserId,
        authorName: row.authorName ?? 'OVPCASSS',
        authorRole: row.authorRole,
      }));
    },
  };

  /** One query for the page's rows, so the queue never runs N attachment reads. */
  async function pendingAttachmentReports(ids: readonly string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();

    const rows = await db
      .select({ reportId: attachments.reportId })
      .from(attachments)
      .where(and(inArray(attachments.reportId, ids), eq(attachments.status, 'PENDING')));

    return new Set(rows.map((row) => row.reportId));
  }
}

export type ReportReadQueries = ReturnType<typeof createReportReadQueries>;

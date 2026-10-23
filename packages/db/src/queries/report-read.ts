import type {
  ReportFilterOption,
  ReportListFacets,
  ReportSortField,
  ReportStatus,
  SortDirection,
} from '@par/shared';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
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
  type ReportCommentRow,
  type ReportPicRow,
  type ReportRow,
} from '../schema/reports';

export function likePattern(term: string): string {
  return `%${term.trim()}%`;
}

export interface ReportWithNames extends ReportRow {
  campusName: string;
  unitName: string;
  createdByName: string;
}

export interface ReportListFilter {
  viewer: { userId: string; isAdmin: boolean };
  tab: 'all' | 'pending' | 'submitted' | 'returned' | 'approved';
  archived?: 'active' | 'archived' | 'all' | undefined;
  type?: string | undefined;
  campus?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
  /** Matches a personnel in charge by name only. */
  picName?: string | undefined;
  /** Matches the name of the account that submitted the narrative. */
  submittedBy?: string | undefined;
  sort: ReportSortField;
  dir: SortDirection;
  page: number;
  size: number;
}

export interface ReportListPage {
  rows: ReportRow[];
  total: number;
}

export interface ReportSearchOptions {
  viewer: { userId: string; isAdmin: boolean };
  q?: string | undefined;
  limit: number;
}

export interface ReportSearchRow extends ReportRow {
  unitName: string | null;
  picNames: string;
}

export interface CommentWithAuthor extends ReportCommentRow {
  authorName: string;
}

const TAB_STATUSES: Record<ReportListFilter['tab'], SQL | undefined> = {
  all: undefined,
  pending: eq(reports.status, 'PENDING'),
  submitted: eq(reports.status, 'SUBMITTED'),
  returned: eq(reports.status, 'RETURNED'),
  approved: eq(reports.status, 'APPROVED'),
};

/**
 * One deploy window reads a stored `DRAFT` as `PENDING`, so a request landing
 * between the data script and the Worker deploy still answers. The stored value
 * is rewritten by `scripts/rename-draft-status.sql` (spec §15.2).
 */
function normalizeStatus<T extends { status: ReportStatus }>(row: T): T {
  if ((row.status as string) !== 'DRAFT') return row;
  return { ...row, status: 'PENDING' as ReportStatus };
}

/** SQLite takes at most 999 bound values; ids are batched well below that. */
const ID_BATCH = 80;

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export function createReportReadQueries(db: Database) {
  /**
   * The register is no longer scoped to PIC membership (spec §5): a PIC browses
   * every activity and claims one by writing its narrative, so every signed-in
   * reader sees the same list, search and location suggestions.
   */

  async function campusOptions(): Promise<ReportFilterOption[]> {
    const rows = await db.select().from(refCampuses).orderBy(asc(refCampuses.sortOrder));
    return rows.map((row) => ({ id: row.id, label: row.name, isActive: row.isActive }));
  }

  async function termOptions(): Promise<ReportFilterOption[]> {
    const rows = await db
      .select()
      .from(refTerms)
      .orderBy(desc(refTerms.schoolYear), desc(refTerms.semester));
    return rows.map((row) => ({
      id: row.id,
      label: `${row.semester === 'SUMMER' ? 'Summer' : `${row.semester}${row.semester === '1' ? 'st' : 'nd'} Semester`} · SY ${row.schoolYear}`,
      isActive: row.isActive,
    }));
  }

  async function picsByReport(ids: readonly string[]): Promise<Map<string, ReportPicRow[]>> {
    const map = new Map<string, ReportPicRow[]>();
    for (const batch of chunks(ids, ID_BATCH)) {
      const rows = await db
        .select()
        .from(reportPics)
        .where(inArray(reportPics.reportId, batch))
        .orderBy(asc(reportPics.sortOrder));
      for (const row of rows) map.set(row.reportId, [...(map.get(row.reportId) ?? []), row]);
    }
    return map;
  }

  return {
    async findById(id: string): Promise<ReportRow | null> {
      const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
      return rows[0] ? normalizeStatus(rows[0]) : null;
    },

    async findWithNames(id: string): Promise<ReportWithNames | null> {
      const rows = await db
        .select({
          report: reports,
          campusName: refCampuses.name,
          unitName: refUnits.name,
          createdByName: users.fullName,
        })
        .from(reports)
        .leftJoin(refCampuses, eq(reports.campusId, refCampuses.id))
        .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
        .leftJoin(users, eq(reports.createdByUserId, users.id))
        .where(eq(reports.id, id))
        .limit(1);

      const row = rows[0];
      if (!row) return null;
      return {
        ...normalizeStatus(row.report),
        campusName: row.campusName ?? '',
        unitName: row.unitName ?? '',
        createdByName: row.createdByName ?? '',
      };
    },

    async findTerm(id: string) {
      const rows = await db.select().from(refTerms).where(eq(refTerms.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async isPic(reportId: string, userId: string): Promise<boolean> {
      const rows = await db
        .select({ id: reportPics.id })
        .from(reportPics)
        .where(and(eq(reportPics.reportId, reportId), eq(reportPics.userId, userId)))
        .limit(1);
      return Boolean(rows[0]);
    },

    async listPics(reportId: string): Promise<ReportPicRow[]> {
      return db
        .select()
        .from(reportPics)
        .where(eq(reportPics.reportId, reportId))
        .orderBy(asc(reportPics.sortOrder));
    },

    /** The account that submitted each record, for the register's column. */
    async submitterNames(ids: readonly string[]): Promise<Map<string, string>> {
      const names = new Map<string, string>();
      if (ids.length === 0) return names;

      for (const batch of chunks(ids, ID_BATCH)) {
        const rows = await db
          .select({ reportId: reports.id, fullName: users.fullName })
          .from(reports)
          .leftJoin(users, eq(reports.submittedByUserId, users.id))
          .where(inArray(reports.id, batch));

        for (const row of rows) {
          if (row.fullName) names.set(row.reportId, row.fullName);
        }
      }

      return names;
    },

    async list(filter: ReportListFilter): Promise<ReportListPage> {
      const conditions: (SQL | undefined)[] = [
        filter.archived === 'archived'
          ? isNotNull(reports.archivedAt)
          : filter.archived === 'all'
            ? undefined
            : isNull(reports.archivedAt),
        TAB_STATUSES[filter.tab],
        filter.type ? eq(reports.type, filter.type as ReportRow['type']) : undefined,
        filter.campus ? eq(reports.campusId, filter.campus) : undefined,
        filter.from ? gte(reports.activityStartDate, filter.from) : undefined,
        filter.to ? lte(reports.activityStartDate, filter.to) : undefined,
      ];

      if (filter.picName) {
        const term = likePattern(filter.picName);
        conditions.push(
          inArray(
            reports.id,
            db
              .select({ id: reportPics.reportId })
              .from(reportPics)
              .where(like(reportPics.name, term)),
          ),
        );
      }

      if (filter.submittedBy) {
        const term = likePattern(filter.submittedBy);
        conditions.push(
          inArray(
            reports.submittedByUserId,
            db.select({ id: users.id }).from(users).where(like(users.fullName, term)),
          ),
        );
      }

      if (filter.q) {
        const term = likePattern(filter.q);
        conditions.push(
          or(
            like(reports.referenceNo, term),
            like(reports.title, term),
            like(reports.location, term),
            inArray(
              reports.id,
              db
                .select({ id: reportPics.reportId })
                .from(reportPics)
                .where(or(like(reportPics.name, term), like(reportPics.email, term))),
            ),
          ),
        );
      }

      const where = and(...conditions.filter((entry): entry is SQL => entry !== undefined));
      const order =
        filter.sort === 'referenceNo'
          ? filter.dir === 'asc'
            ? asc(reports.sequence)
            : desc(reports.sequence)
          : filter.sort === 'activityDate'
            ? filter.dir === 'asc'
              ? asc(reports.activityStartDate)
              : desc(reports.activityStartDate)
            : filter.sort === 'status'
              ? filter.dir === 'asc'
                ? asc(reports.status)
                : desc(reports.status)
              : filter.dir === 'asc'
                ? asc(reports.updatedAt)
                : desc(reports.updatedAt);

      const [rows, total] = await Promise.all([
        db
          .select()
          .from(reports)
          .where(where)
          .orderBy(order)
          .limit(filter.size)
          .offset((filter.page - 1) * filter.size),
        db
          .select({ value: sql<number>`count(*)` })
          .from(reports)
          .where(where)
          .then((result) => Number(result[0]?.value ?? 0)),
      ]);

      return { rows: rows.map(normalizeStatus), total };
    },

    async search(options: ReportSearchOptions): Promise<ReportSearchRow[]> {
      const conditions: (SQL | undefined)[] = [];

      if (options.q) {
        const term = likePattern(options.q);
        conditions.push(
          or(
            like(reports.referenceNo, term),
            like(reports.title, term),
            like(reports.narrative, term),
            like(reports.location, term),
            inArray(
              reports.id,
              db
                .select({ id: reportPics.reportId })
                .from(reportPics)
                .where(or(like(reportPics.name, term), like(reportPics.email, term))),
            ),
          ),
        );
      }

      const rows = await db
        .select({ report: reports, unitName: refUnits.name })
        .from(reports)
        .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
        .where(and(...conditions.filter((entry): entry is SQL => entry !== undefined)))
        .orderBy(desc(reports.updatedAt))
        .limit(options.limit);

      const pics = await picsByReport(rows.map((row) => row.report.id));

      return rows.map((row) => ({
        ...normalizeStatus(row.report),
        unitName: row.unitName ?? null,
        picNames: (pics.get(row.report.id) ?? []).map((pic) => pic.name).join(', '),
      }));
    },

    /**
     * Locations this viewer may read, newest first and case-insensitively
     * deduplicated (bug phase 04 §3.1). Free text stays the stored value.
     */
    async locations(
      _viewer: ReportListFilter['viewer'],
      query: string,
      limit: number,
    ): Promise<{ location: string; lastUsedAt: string }[]> {
      const rows = await db
        .select({ location: reports.location, updatedAt: reports.updatedAt })
        .from(reports)
        .orderBy(desc(reports.updatedAt))
        .limit(500);

      const needle = query.trim().toLowerCase();
      const seen = new Map<string, { location: string; lastUsedAt: string }>();

      for (const row of rows) {
        const location = row.location.trim();
        if (!location) continue;

        const key = location.toLowerCase();
        if (seen.has(key)) continue;
        if (needle && !key.includes(needle)) continue;

        seen.set(key, { location, lastUsedAt: row.updatedAt });
        if (seen.size === limit) break;
      }

      return [...seen.values()];
    },

    async listFacets(): Promise<ReportListFacets> {
      const [campuses, terms] = await Promise.all([campusOptions(), termOptions()]);
      return { campuses, terms };
    },

    async listAttachments(reportId: string) {
      return db
        .select()
        .from(attachments)
        .where(and(eq(attachments.reportId, reportId), eq(attachments.status, 'CONFIRMED')))
        .orderBy(asc(attachments.createdAt));
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
        .select({ comment: reportComments, authorName: users.fullName })
        .from(reportComments)
        .leftJoin(users, eq(reportComments.authorUserId, users.id))
        .where(eq(reportComments.reportId, reportId))
        .orderBy(asc(reportComments.createdAt));

      return rows.map((row) => ({ ...row.comment, authorName: row.authorName ?? '' }));
    },

    async pendingAttachmentReports(ids: readonly string[]): Promise<Set<string>> {
      if (ids.length === 0) return new Set();
      const rows = await db
        .select({ reportId: attachments.reportId })
        .from(attachments)
        .where(and(inArray(attachments.reportId, [...ids]), eq(attachments.status, 'PENDING')));
      return new Set(rows.map((row) => row.reportId));
    },
  };
}

export type ReportReadQueries = ReturnType<typeof createReportReadQueries>;

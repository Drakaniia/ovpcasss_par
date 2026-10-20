import type {
  RepositoryFacets,
  RepositoryItem,
  RepositoryQuery,
  RepositoryStatus,
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
import { refCampuses, refSdgs, refTerms, refUnits } from '../schema/reference-data';
import { reportPics, reports, reportSdgs } from '../schema/reports';

import { likePattern } from './report-read';

export interface RepositoryRow extends RepositoryItem {
  narrative: string;
}

export interface RepositoryPage {
  rows: RepositoryRow[];
  total: number;
  facets: RepositoryFacets;
}

const SEMESTER_LABELS: Record<string, string> = {
  '1': '1st Semester',
  '2': '2nd Semester',
  SUMMER: 'Summer',
};

/**
 * Repository retrieval (spec §7.11). Drafts are not repository records, so the
 * query only ever sees submitted states; free text covers title, narrative,
 * location, and PIC name.
 */
export function createReportSearchQueries(db: Database) {
  return {
    async search(
      query: RepositoryQuery & {
        activityFrom?: string | undefined;
        activityTo?: string | undefined;
      },
    ): Promise<RepositoryPage> {
      const conditions: SQL[] = [eq(reports.status, query.status as RepositoryStatus)];

      if (query.type) conditions.push(eq(reports.type, query.type));
      if (query.classification) conditions.push(eq(reports.classification, query.classification));
      if (query.campus) conditions.push(eq(reports.campusId, query.campus));
      if (query.college) conditions.push(eq(reports.unitId, query.college));
      if (query.level) conditions.push(eq(reports.level, query.level));
      if (query.department)
        conditions.push(like(reports.department, likePattern(query.department)));
      if (query.office) conditions.push(like(reports.office, likePattern(query.office)));
      if (query.title) conditions.push(like(reports.title, likePattern(query.title)));
      if (query.tracking)
        conditions.push(like(reports.trackingNumber, likePattern(query.tracking)));
      if (query.receivedFrom) conditions.push(gte(reports.submittedAt, query.receivedFrom));
      if (query.receivedTo)
        conditions.push(lte(reports.submittedAt, `${query.receivedTo}T23:59:59.999Z`));
      if (query.activityFrom) conditions.push(gte(reports.activityStartDate, query.activityFrom));
      if (query.activityTo) conditions.push(lte(reports.activityStartDate, query.activityTo));

      if (query.pic) {
        conditions.push(
          inArray(
            reports.id,
            db
              .select({ id: reportPics.reportId })
              .from(reportPics)
              .where(like(reportPics.name, likePattern(query.pic))),
          ),
        );
      }

      if (query.sdg && query.sdg.length > 0) {
        conditions.push(
          inArray(
            reports.id,
            db
              .select({ id: reportSdgs.reportId })
              .from(reportSdgs)
              .where(inArray(reportSdgs.sdgId, query.sdg)),
          ),
        );
      }

      if (query.q) {
        const term = likePattern(query.q);
        conditions.push(
          or(
            like(reports.title, term),
            like(reports.narrative, term),
            like(reports.location, term),
            inArray(
              reports.id,
              db
                .select({ id: reportPics.reportId })
                .from(reportPics)
                .where(like(reportPics.name, term)),
            ),
          )!,
        );
      }

      const where = and(...conditions);
      const order =
        query.sort === 'title'
          ? query.dir === 'asc'
            ? asc(reports.title)
            : desc(reports.title)
          : query.dir === 'asc'
            ? asc(reports.submittedAt)
            : desc(reports.submittedAt);

      const [rows, total] = await Promise.all([
        db
          .select({
            report: reports,
            college: refUnits.name,
          })
          .from(reports)
          .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
          .where(where)
          .orderBy(order, desc(reports.updatedAt))
          .limit(query.size)
          .offset((query.page - 1) * query.size),
        db
          .select({ value: sql<number>`count(*)` })
          .from(reports)
          .where(where)
          .then((result) => Number(result[0]?.value ?? 0)),
      ]);

      return {
        rows: rows.map((row) => ({
          id: row.report.id,
          ownerUserId: row.report.ownerUserId,
          trackingNumber: row.report.trackingNumber,
          title: row.report.title,
          type: row.report.type,
          classification: row.report.classification,
          level: row.report.level,
          status: row.report.status as RepositoryStatus,
          campusId: row.report.campusId,
          collegeId: row.report.unitId,
          college: row.college ?? '',
          receivedAt: row.report.submittedAt ?? row.report.updatedAt,
          activityStartDate: row.report.activityStartDate,
          activityEndDate: row.report.activityEndDate,
          narrative: row.report.narrative,
        })),
        total,
        facets: await facets(),
      };
    },
  };

  async function facets(): Promise<RepositoryFacets> {
    const [campuses, colleges, terms, sdgs] = await Promise.all([
      db
        .select()
        .from(refCampuses)
        .where(isNull(refCampuses.deletedAt))
        .orderBy(asc(refCampuses.sortOrder), asc(refCampuses.name)),
      db
        .select()
        .from(refUnits)
        .where(isNull(refUnits.deletedAt))
        .orderBy(asc(refUnits.sortOrder), asc(refUnits.name)),
      db
        .select()
        .from(refTerms)
        .where(isNull(refTerms.deletedAt))
        .orderBy(desc(refTerms.schoolYear), desc(refTerms.semester)),
      db.select().from(refSdgs).where(isNull(refSdgs.deletedAt)).orderBy(asc(refSdgs.number)),
    ]);

    return {
      campuses: campuses.map((row) => ({ id: row.id, label: row.name, isActive: row.isActive })),
      colleges: colleges.map((row) => ({ id: row.id, label: row.name, isActive: row.isActive })),
      terms: terms.map((row) => ({
        id: row.id,
        label: `${SEMESTER_LABELS[row.semester] ?? row.semester} \u00b7 SY ${row.schoolYear}`,
        isActive: row.isActive,
      })),
      sdgs: sdgs.map((row) => ({
        id: row.id,
        label: `SDG ${row.number} \u00b7 ${row.title}`,
        isActive: row.isActive,
      })),
    };
  }
}

export type ReportSearchQueries = ReturnType<typeof createReportSearchQueries>;

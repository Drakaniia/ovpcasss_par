import type { ReportStatus, ReportType, Semester } from '@par/shared';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import type { Database } from '../client';
import { refCampuses, refSdgs, refTerms, refUnits } from '../schema/reference-data';
import {
  reportPics,
  reports,
  reportSdgs,
  trackingCounters,
  type NewReportRow,
  type ReportPicRow,
  type ReportRow,
} from '../schema/reports';

/** A report as the monitoring sheet needs it: names resolved, lists gathered. */
export interface MonitoringReportRecord {
  id: string;
  type: ReportType;
  trackingNumber: string | null;
  status: ReportStatus;
  classification: ReportRow['classification'];
  campusName: string;
  unitName: string;
  department: string | null;
  office: string | null;
  level: ReportRow['level'];
  title: string;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  totalStudents: number;
  totalPic: number;
  submittedAt: string | null;
  approvedAt: string | null;
  narrative: string;
  sdgNumbers: number[];
  pics: { name: string; email: string | null; phone: string | null }[];
}

export interface MonitoringReportFilter {
  /** Omit to read all three sheets in one pass, as the workbook does. */
  type?: ReportType;
  /** Inclusive activity-date window of the selected term. */
  from: string;
  to: string;
  statuses: readonly ReportStatus[];
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

/**
 * Report reads and writes used by the monitoring workbook. Kept beside the
 * other query modules so routes never build SQL (spec §7).
 */
export function createMonitoringQueries(db: Database) {
  async function withLists(
    rows: (Omit<MonitoringReportRecord, 'sdgNumbers' | 'pics'> & { id: string })[],
  ): Promise<MonitoringReportRecord[]> {
    if (rows.length === 0) return [];

    const sdgs = new Map<string, number[]>();
    const pics = new Map<string, MonitoringReportRecord['pics']>();

    for (const batch of chunks(
      rows.map((row) => row.id),
      ID_BATCH,
    )) {
      const sdgRows = await db
        .select({ reportId: reportSdgs.reportId, number: refSdgs.number })
        .from(reportSdgs)
        .innerJoin(refSdgs, eq(reportSdgs.sdgId, refSdgs.id))
        .where(inArray(reportSdgs.reportId, batch));

      for (const row of sdgRows) {
        sdgs.set(row.reportId, [...(sdgs.get(row.reportId) ?? []), row.number]);
      }

      const picRows = await db
        .select()
        .from(reportPics)
        .where(inArray(reportPics.reportId, batch))
        .orderBy(asc(reportPics.sortOrder));

      for (const row of picRows) {
        pics.set(row.reportId, [
          ...(pics.get(row.reportId) ?? []),
          { name: row.name, email: row.email, phone: row.phone },
        ]);
      }
    }

    return rows.map((row) => ({
      ...row,
      sdgNumbers: (sdgs.get(row.id) ?? []).sort((left, right) => left - right),
      pics: pics.get(row.id) ?? [],
    }));
  }

  return {
    /** The term row supplies the date window and the title's semester/SY. */
    async findTerm(schoolYear: string, semester: Semester) {
      const rows = await db
        .select()
        .from(refTerms)
        .where(
          and(
            eq(refTerms.schoolYear, schoolYear),
            eq(refTerms.semester, String(semester) as '1' | '2' | 'SUMMER'),
            eq(refTerms.isActive, true),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    /** Monitoring rows for one term, ordered the way the office reads the sheet. */
    async listReports(filter: MonitoringReportFilter): Promise<MonitoringReportRecord[]> {
      const conditions = [
        gte(reports.activityStartDate, filter.from),
        lte(reports.activityStartDate, filter.to),
        inArray(reports.status, filter.statuses),
      ];
      if (filter.type) conditions.push(eq(reports.type, filter.type));

      const rows = await db
        .select({
          id: reports.id,
          type: reports.type,
          trackingNumber: reports.trackingNumber,
          status: reports.status,
          classification: reports.classification,
          campusName: refCampuses.name,
          unitName: refUnits.name,
          department: reports.department,
          office: reports.office,
          level: reports.level,
          title: reports.title,
          activityStartDate: reports.activityStartDate,
          activityEndDate: reports.activityEndDate,
          location: reports.location,
          totalStudents: reports.totalStudents,
          totalPic: reports.totalPic,
          submittedAt: reports.submittedAt,
          approvedAt: reports.approvedAt,
          narrative: reports.narrative,
        })
        .from(reports)
        .leftJoin(refCampuses, eq(reports.campusId, refCampuses.id))
        .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
        .where(and(...conditions))
        .orderBy(asc(reports.type), asc(reports.submittedAt), asc(reports.trackingNumber));

      return withLists(
        rows.map((row) => ({
          ...row,
          campusName: row.campusName ?? '',
          unitName: row.unitName ?? '',
        })),
      );
    },

    async findByTrackingNumbers(numbers: readonly string[]): Promise<Map<string, ReportRow>> {
      const found = new Map<string, ReportRow>();

      for (const batch of chunks(numbers, ID_BATCH)) {
        const rows = await db.select().from(reports).where(inArray(reports.trackingNumber, batch));

        for (const row of rows) {
          if (row.trackingNumber) found.set(row.trackingNumber, row);
        }
      }

      return found;
    },

    async insertImportedReport(
      values: NewReportRow,
      sdgIds: readonly string[],
      pics: readonly Omit<ReportPicRow, 'reportId'>[],
    ): Promise<void> {
      await db.insert(reports).values(values);

      if (sdgIds.length > 0) {
        await db.insert(reportSdgs).values(sdgIds.map((sdgId) => ({ reportId: values.id, sdgId })));
      }

      if (pics.length > 0) {
        await db.insert(reportPics).values(pics.map((pic) => ({ ...pic, reportId: values.id })));
      }
    },

    /**
     * Updates the monitoring fields of an existing report. Imported edits do not
     * touch the narrative, owner, or version: those belong to the submitter.
     */
    async updateImportedReport(
      id: string,
      values: Partial<NewReportRow>,
      sdgIds: readonly string[],
      pics: readonly Omit<ReportPicRow, 'reportId'>[],
    ): Promise<void> {
      await db.update(reports).set(values).where(eq(reports.id, id));

      await db.delete(reportSdgs).where(eq(reportSdgs.reportId, id));
      if (sdgIds.length > 0) {
        await db.insert(reportSdgs).values(sdgIds.map((sdgId) => ({ reportId: id, sdgId })));
      }

      await db.delete(reportPics).where(eq(reportPics.reportId, id));
      if (pics.length > 0) {
        await db.insert(reportPics).values(pics.map((pic) => ({ ...pic, reportId: id })));
      }
    },

    /**
     * Keeps the sequence ahead of numbers imported from a workbook, so the next
     * submit cannot mint a number the sheet already uses (spec §7.7).
     */
    async raiseTrackingCounter(prefix: string, year: number, seq: number): Promise<void> {
      await db
        .insert(trackingCounters)
        .values({ prefix, year, lastSeq: seq })
        .onConflictDoUpdate({
          target: [trackingCounters.prefix, trackingCounters.year],
          set: {
            lastSeq: sql`max(${trackingCounters.lastSeq}, excluded.last_seq)`,
          },
        });
    },
  };
}

export type MonitoringQueries = ReturnType<typeof createMonitoringQueries>;

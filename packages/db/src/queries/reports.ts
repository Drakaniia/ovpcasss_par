import type { ReportStatus, ReportType, Semester } from '@par/shared';
import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';

import type { Database } from '../client';
import { refCampuses, refSdgs, refTerms, refUnits } from '../schema/reference-data';
import { reportPics, reports, reportSdgs, type ReportRow } from '../schema/reports';

/** A report as the monitoring sheet needs it: names resolved, lists gathered. */
export interface MonitoringReportRecord {
  id: string;
  type: ReportType;
  referenceNo: string;
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
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  narrative: string;
  sdgNumbers: number[];
  pics: { name: string; email: string; phone: string | null }[];
}

export interface MonitoringReportFilter {
  type?: ReportType;
  from: string;
  to: string;
  statuses: readonly ReportStatus[];
  /** Filing flag: archived records stay out of the sheet unless asked for. */
  includeArchived?: boolean;
}

export interface OverdueDraft {
  id: string;
  referenceNo: string;
  title: string;
  createdAt: string;
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

/** Report reads used by the monitoring workbook and the office reminders. */
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
        ...(filter.includeArchived ? [] : [isNull(reports.archivedAt)]),
      ];
      if (filter.type) conditions.push(eq(reports.type, filter.type));

      const rows = await db
        .select({
          id: reports.id,
          type: reports.type,
          referenceNo: reports.referenceNo,
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
          createdAt: reports.createdAt,
          submittedAt: reports.submittedAt,
          approvedAt: reports.approvedAt,
          narrative: reports.narrative,
        })
        .from(reports)
        .leftJoin(refCampuses, eq(reports.campusId, refCampuses.id))
        .leftJoin(refUnits, eq(reports.unitId, refUnits.id))
        .where(and(...conditions))
        .orderBy(asc(reports.type), asc(reports.submittedAt), asc(reports.sequence));

      return withLists(
        rows.map((row) => ({
          ...row,
          campusName: row.campusName ?? '',
          unitName: row.unitName ?? '',
        })),
      );
    },

    /**
     * Unsubmitted records older than the reminder threshold. The sweep sends at
     * most three reminders per record, tracked by the outbox (spec §11).
     */
    async listOverduePending(createdBeforeIso: string): Promise<OverdueDraft[]> {
      return db
        .select({
          id: reports.id,
          referenceNo: reports.referenceNo,
          title: reports.title,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(and(eq(reports.status, 'PENDING'), lte(reports.createdAt, createdBeforeIso)))
        .orderBy(asc(reports.createdAt));
    },
  };
}

export type MonitoringQueries = ReturnType<typeof createMonitoringQueries>;

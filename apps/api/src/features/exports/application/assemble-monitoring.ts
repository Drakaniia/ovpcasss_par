import type { MonitoringQueries, MonitoringReportRecord } from '@par/db';
import type { MonitoringExportRequest, ReportStatus, Semester } from '@par/shared';

import { buildMonitoringSheet, type MonitoringSheet } from './monitoring-sheets';

export type MonitoringAssembly =
  { ok: true; sheet: MonitoringSheet } | { ok: false; message: string };

const APPROVED_ONLY: readonly ReportStatus[] = ['APPROVED'];
const WITH_IN_PROGRESS: readonly ReportStatus[] = ['APPROVED', 'SUBMITTED', 'RETURNED', 'DRAFT'];

/**
 * Term is the bucket: the activity date decides which term a report belongs to
 * (spec §14 Q7, assumed). A missing term is a configuration problem with a
 * message the admin can act on, not an empty workbook.
 */
export async function assembleMonitoring(
  queries: MonitoringQueries,
  request: MonitoringExportRequest,
): Promise<MonitoringAssembly> {
  const term = await queries.findTerm(request.schoolYear, request.semester as Semester);

  if (!term) {
    return {
      ok: false,
      message: `No active term is configured for SY ${request.schoolYear}, semester ${request.semester}. Add it in Reference data.`,
    };
  }

  const reports = await queries.listReports({
    type: request.type,
    from: term.startsOn,
    to: term.endsOn,
    statuses: request.includeInProgress ? WITH_IN_PROGRESS : APPROVED_ONLY,
  });

  return {
    ok: true,
    sheet: buildMonitoringSheet(reports as MonitoringReportRecord[], request),
  };
}

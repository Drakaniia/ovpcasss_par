import type { MonitoringReportRecord } from '@par/db';
import type { Classification, Level, MonitoringSheetRow } from '@par/shared';

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  CURRICULAR: 'Curricular',
  NON_CURRICULAR: 'Non-Curricular',
};

const LEVEL_LABELS: Record<Level, string> = {
  GRADUATE: 'Graduate',
  UNDERGRADUATE: 'Undergraduate',
};

/** Timestamps are stored UTC; the sheet only ever shows the date. */
function isoDate(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export function toMonitoringRow(report: MonitoringReportRecord, index: number): MonitoringSheetRow {
  return {
    index,
    dateReceived: isoDate(report.submittedAt),
    trackingNumber: report.trackingNumber ?? '',
    classification: CLASSIFICATION_LABELS[report.classification],
    campus: report.campusName,
    college: report.unitName,
    department: report.department ?? '',
    office: report.office ?? '',
    level: LEVEL_LABELS[report.level],
    title: report.title,
    sdg: report.sdgNumbers.join(', '),
    activityDate: isoDate(report.activityStartDate),
    location: report.location,
    totalStudents: report.totalStudents,
    totalPic: report.totalPic,
    picName: report.pics
      .map((pic) => pic.name)
      .filter(Boolean)
      .join('; '),
    picContact: report.pics
      .flatMap((pic) => [pic.email, pic.phone])
      .filter((value): value is string => Boolean(value))
      .join('; '),
    dateCompleted: isoDate(report.approvedAt),
  };
}

const WATCHED_FIELDS: readonly [keyof MonitoringSheetRow, string][] = [
  ['department', 'Department'],
  ['office', 'Office'],
  ['sdg', 'SDG'],
  ['picName', 'Name of Personnel In-charge'],
  ['picContact', 'PIC email/contact number'],
  ['activityDate', 'Date of the Activity'],
];

export interface MonitoringGaps {
  /** Fields that will export blank, named per report. */
  warnings: string[];
  /** Reports with at least one blank field, not warning lines. */
  missingCount: number;
}

/**
 * Fields that will export blank, named per report. A warning never blocks the
 * download; it tells the office what the sheet will be missing (phase 14 §3).
 */
export function monitoringGaps(
  reports: readonly MonitoringReportRecord[],
  rows: readonly MonitoringSheetRow[],
): MonitoringGaps {
  const warnings: string[] = [];
  let missingCount = 0;

  reports.forEach((report, index) => {
    const row = rows[index];
    if (!row) return;

    const label = row.trackingNumber || `Row ${row.index}`;
    let missing = 0;

    for (const [field, name] of WATCHED_FIELDS) {
      if (!row[field]) {
        warnings.push(`${label} has no ${name} — it will export blank.`);
        missing += 1;
      }
    }

    if (report.status === 'APPROVED' && !row.dateCompleted) {
      warnings.push(`${label} has no Date Completed — it will export blank.`);
      missing += 1;
    }

    if (missing > 0) missingCount += 1;
  });

  return { warnings, missingCount };
}

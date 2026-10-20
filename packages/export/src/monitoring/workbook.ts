import type { MonitoringSheetRow, ReportType } from '@par/shared';

import { blankMonitoringSheetTitle, monitoringSheetTitle } from './columns';
import { buildXlsxPackage, type SheetCell, type SheetSpec } from './ooxml/package';

/** Sheet order in the source workbook, and the order the template writes. */
export const MONITORING_SHEET_ORDER = [
  'OFF_CAMPUS',
  'EDUCATIONAL_TOUR',
  'IN_CAMPUS',
] as const satisfies readonly ReportType[];

export interface MonitoringWorkbookInput {
  type: ReportType;
  schoolYear: string;
  semester: 1 | 2;
  rows: readonly MonitoringSheetRow[];
  /** Fixed for tests; production defaults to now. */
  createdAt?: string;
}

/** A date field is a real date cell; an empty one stays blank, never text. */
function dateCell(value: string): SheetCell {
  return value ? { date: value } : null;
}

function bodyCells(row: MonitoringSheetRow): SheetCell[] {
  return [
    row.index,
    dateCell(row.dateReceived),
    row.trackingNumber,
    row.classification,
    row.campus,
    row.college,
    row.department,
    row.office,
    row.level,
    row.title,
    row.sdg,
    dateCell(row.activityDate),
    row.location,
    row.totalStudents,
    row.totalPic,
    row.picName,
    row.picContact,
    dateCell(row.dateCompleted),
  ];
}

/**
 * The office's whole workbook for one term, laid out as the source file lays it
 * out: title line, letterhead, merged A1:R1, column widths, print setup,
 * signature block, and 18 columns on every sheet. All three sheets ship in
 * source order; the requested one carries the rows and the other two are the
 * source's blank sheets, so the file the office opens is the file it files.
 */
export function buildMonitoringWorkbook(input: MonitoringWorkbookInput): Uint8Array {
  const sheets: SheetSpec[] = MONITORING_SHEET_ORDER.map((type) => ({
    type,
    title: monitoringSheetTitle(type, input.semester, input.schoolYear),
    rows: type === input.type ? input.rows.map(bodyCells) : [],
  }));

  return buildXlsxPackage(sheets, input.createdAt ? { createdAt: input.createdAt } : {});
}

/**
 * Blank workbook an admin can fill in Excel and upload back: identical to the
 * source template, with the term left as underscores.
 */
export function buildMonitoringTemplate(options: { createdAt?: string } = {}): Uint8Array {
  const sheets: SheetSpec[] = MONITORING_SHEET_ORDER.map((type) => ({
    type,
    title: blankMonitoringSheetTitle(type),
    rows: [],
  }));

  return buildXlsxPackage(sheets, options.createdAt ? { createdAt: options.createdAt } : {});
}

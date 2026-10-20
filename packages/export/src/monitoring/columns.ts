import type { ReportType } from '@par/shared';

export interface MonitoringColumn {
  key: string;
  label: string;
}

/**
 * Column order matches the three source workbook sheets (spec §7.13). These
 * labels are the ones the exports preview shows. The workbook's own header row,
 * widths, and print setup live with the source layout in `ooxml/sample`; there
 * is no second copy to drift.
 */
export const MONITORING_COLUMNS = [
  { key: 'index', label: 'No.' },
  { key: 'dateReceived', label: 'Date Received' },
  { key: 'trackingNumber', label: 'Tracking Number' },
  { key: 'classification', label: 'Classification of Off / In Campus Activity' },
  { key: 'campus', label: 'Campus' },
  { key: 'college', label: 'College' },
  { key: 'department', label: 'Department' },
  { key: 'office', label: 'Office' },
  { key: 'level', label: 'Graduate / Undergraduate' },
  { key: 'title', label: 'Title of the Activity' },
  { key: 'sdg', label: 'SDG' },
  { key: 'activityDate', label: 'Date of the Activity' },
  { key: 'location', label: 'Location' },
  { key: 'totalStudents', label: 'Total Number of Students' },
  { key: 'totalPic', label: 'Total Number of PIC' },
  { key: 'picName', label: 'Name of Personnel In-charge' },
  { key: 'picContact', label: 'PIC Email / Contact Number' },
  { key: 'dateCompleted', label: 'Date Completed' },
] as const satisfies readonly MonitoringColumn[];

export const MONITORING_SHEET_TITLES = {
  OFF_CAMPUS: 'LOCAL OFF-CAMPUS  ACTIVITIES MONITORING',
  EDUCATIONAL_TOUR: 'LOCAL OFF-CAMPUS  ACTIVITIES MONITORING',
  IN_CAMPUS: 'IN-CAMPUS MONITORING',
} as const;

/** Sheet tab names in the source workbook. Import matches on these. */
export const MONITORING_SHEET_NAMES = {
  OFF_CAMPUS: 'OFF-CAMPUS',
  EDUCATIONAL_TOUR: 'EDUCATIONAL TOUR',
  IN_CAMPUS: 'IN-CAMPUS',
} as const satisfies Record<ReportType, string>;

const SEMESTER_ORDINAL = { 1: '1st', 2: '2nd' } as const;
const BLANK_TERM = {
  OFF_CAMPUS: '______ SEMESTER, SY ________',
  EDUCATIONAL_TOUR: '______ SEMESTER, SY ________',
  IN_CAMPUS: '______ SEMESTER, SY _________',
} as const;

/** Title line as the source sheet writes it, with the term filled in. */
export function monitoringSheetTitle(
  type: ReportType,
  semester: 1 | 2,
  schoolYear: string,
): string {
  return `${MONITORING_SHEET_TITLES[type]}\n${SEMESTER_ORDINAL[semester]} SEMESTER, SY ${schoolYear}`;
}

/** Blank template title, matching the underscores in the source workbook. */
export function blankMonitoringSheetTitle(type: ReportType): string {
  return `${MONITORING_SHEET_TITLES[type]}\n${BLANK_TERM[type]}`;
}

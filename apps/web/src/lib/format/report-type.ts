import type { ReportType } from '@par/shared';

/** Display labels for the report type enum, matching the official form contract. */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  OFF_CAMPUS: 'Off-campus',
  EDUCATIONAL_TOUR: 'Educational tour',
  IN_CAMPUS: 'In-campus',
};

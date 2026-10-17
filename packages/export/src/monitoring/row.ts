import type { ReportType } from '@par/shared';

/** One exported row, keyed by `MONITORING_COLUMNS[number]['key']` (spec §7.13). */
export interface MonitoringSheetRow {
  index: number;
  dateReceived: string;
  trackingNumber: string;
  classification: string;
  campus: string;
  college: string;
  department: string;
  office: string;
  level: string;
  title: string;
  sdg: string;
  activityDate: string;
  location: string;
  totalStudents: number;
  totalPic: number;
  picName: string;
  picContact: string;
  dateCompleted: string;
}

export interface MonitoringExportSelection {
  type: ReportType;
  schoolYear: string;
  semester: 1 | 2;
}

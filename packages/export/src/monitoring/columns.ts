export interface MonitoringColumn {
  key: string;
  label: string;
}

/** Column order matches the three source workbook sheets (spec §7.13). */
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
  OFF_CAMPUS: 'LOCAL OFF-CAMPUS ACTIVITIES MONITORING',
  EDUCATIONAL_TOUR: 'LOCAL OFF-CAMPUS ACTIVITIES MONITORING',
  IN_CAMPUS: 'IN-CAMPUS MONITORING',
} as const;

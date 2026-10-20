export type { MonitoringSheetRow } from '@par/shared';

import type { ReportType } from '@par/shared';

/** Rows grouped by the workbook sheet they belong to. */
export type MonitoringRowsByType = Record<
  ReportType,
  readonly import('@par/shared').MonitoringSheetRow[]
>;

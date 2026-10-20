import type { MonitoringReportRecord } from '@par/db';
import {
  MONITORING_COLUMNS,
  MONITORING_SHEET_NAMES,
  SHEET_GEOMETRY,
  monitoringSheetTitle,
} from '@par/export';
import type { MonitoringExportRequest, MonitoringPreviewSheet } from '@par/shared';

import { monitoringGaps, toMonitoringRow } from '../domain/monitoring-rows';

export interface MonitoringSheet {
  sheet: MonitoringPreviewSheet;
  rows: MonitoringPreviewSheet['rows'];
}

/**
 * Builds the same sheet the workbook writes, so the preview and the download
 * cannot disagree (phase 14 §3).
 */
export function buildMonitoringSheet(
  reports: readonly MonitoringReportRecord[],
  request: MonitoringExportRequest,
): MonitoringSheet {
  const selected = reports.filter((report) => report.type === request.type);
  const rows = selected.map((report, index) => toMonitoringRow(report, index + 1));
  const approvedCount = selected.filter((report) => report.status === 'APPROVED').length;
  const gaps = monitoringGaps(selected, rows);

  return {
    rows,
    sheet: {
      type: request.type,
      sheetName: MONITORING_SHEET_NAMES[request.type],
      title: monitoringSheetTitle(request.type, request.semester, request.schoolYear),
      columns: MONITORING_COLUMNS.map((column) => ({ key: column.key, label: column.label })),
      layout: {
        columnWidths: [...SHEET_GEOMETRY[request.type].columnWidths],
        rowHeights: { ...SHEET_GEOMETRY[request.type].rowHeights },
        reservedRows: SHEET_GEOMETRY[request.type].reservedRows,
      },
      approvedCount,
      inProgressCount: selected.length - approvedCount,
      total: selected.length,
      rows,
      missingCount: gaps.missingCount,
      warnings: gaps.warnings,
    },
  };
}

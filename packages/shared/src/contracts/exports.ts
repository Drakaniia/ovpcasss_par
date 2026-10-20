import { z } from 'zod';

import { REPORT_TYPES } from '../domain/enums';
import { isoDateTimeSchema } from './common';

/**
 * One monitoring-sheet row, exactly as the workbook and the exports preview
 * present it (spec §7.13). The column order lives in `@par/export`; the keys
 * here are the contract both sides share.
 */
export const monitoringSheetRowSchema = z.object({
  index: z.number().int().min(1),
  dateReceived: z.string(),
  trackingNumber: z.string(),
  classification: z.string(),
  campus: z.string(),
  college: z.string(),
  department: z.string(),
  office: z.string(),
  level: z.string(),
  title: z.string(),
  sdg: z.string(),
  activityDate: z.string(),
  location: z.string(),
  totalStudents: z.number().int().min(0),
  totalPic: z.number().int().min(0),
  picName: z.string(),
  picContact: z.string(),
  dateCompleted: z.string(),
});
export type MonitoringSheetRow = z.infer<typeof monitoringSheetRowSchema>;

/** Column order and the label the workbook writes, shared by preview and file. */
export const monitoringColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});
export type MonitoringColumn = z.infer<typeof monitoringColumnSchema>;

/**
 * Semester 1/2 only; the sheet title and the term row use the same pair. The
 * type selects the one sheet the preview shows and the workbook downloads.
 */
export const monitoringExportRequestSchema = z.object({
  type: z.enum(REPORT_TYPES),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  semester: z.union([z.literal(1), z.literal(2)]),
  includeInProgress: z.boolean().default(false),
});
export type MonitoringExportRequest = z.infer<typeof monitoringExportRequestSchema>;

/**
 * The worksheet grid the file is written with, so the preview is a facsimile of
 * the print rather than an approximation of it.
 */
export const monitoringSheetLayoutSchema = z.object({
  /** Column A..R widths in Excel character units, as the workbook stores them. */
  columnWidths: z.array(z.number().positive()).min(1),
  /** Row heights in points: the merged title, the header, and a body row. */
  rowHeights: z.object({
    title: z.number().positive(),
    header: z.number().positive(),
    body: z.number().positive(),
  }),
  /** Body rows the sheet keeps below the header, filled or blank. */
  reservedRows: z.number().int().min(0),
});
export type MonitoringSheetLayout = z.infer<typeof monitoringSheetLayoutSchema>;

export const monitoringPreviewSheetSchema = z.object({
  type: z.enum(REPORT_TYPES),
  sheetName: z.string().min(1),
  title: z.string().min(1),
  /** Actual workbook columns, so the preview never invents its own. */
  columns: z.array(monitoringColumnSchema),
  /** Actual workbook geometry, for widths, heights, and reserved rows. */
  layout: monitoringSheetLayoutSchema,
  approvedCount: z.number().int().min(0),
  inProgressCount: z.number().int().min(0),
  total: z.number().int().min(0),
  rows: z.array(monitoringSheetRowSchema),
  /** Reports (not warning lines) that will export with at least one blank field. */
  missingCount: z.number().int().min(0),
  /** Fields that will export blank, named per report. */
  warnings: z.array(z.string()),
});
export type MonitoringPreviewSheet = z.infer<typeof monitoringPreviewSheetSchema>;

export const monitoringPreviewResponseSchema = z.object({
  schoolYear: z.string(),
  semester: z.number().int(),
  /** The selected sheet, matching the workbook the download writes. */
  sheet: monitoringPreviewSheetSchema,
  generatedAt: isoDateTimeSchema,
});
export type MonitoringPreviewResponse = z.infer<typeof monitoringPreviewResponseSchema>;

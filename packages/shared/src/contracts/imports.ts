import { z } from 'zod';

/** What happened to one imported sheet row. Failed rows are never written. */
export const MONITORING_IMPORT_ACTIONS = ['created', 'updated', 'failed'] as const;
export type MonitoringImportAction = (typeof MONITORING_IMPORT_ACTIONS)[number];

export const monitoringImportRowResultSchema = z.object({
  sheetName: z.string(),
  rowNumber: z.number().int().min(1),
  trackingNumber: z.string(),
  title: z.string(),
  action: z.enum(MONITORING_IMPORT_ACTIONS),
  /** Empty when the row was written; the reasons otherwise. */
  issues: z.array(z.string()),
});
export type MonitoringImportRowResult = z.infer<typeof monitoringImportRowResultSchema>;

/**
 * Result of uploading a filled monitoring workbook. `skipped` counts blank
 * rows (the template reserves 20 lines per sheet), never rows that failed.
 */
export const monitoringImportResponseSchema = z.object({
  created: z.number().int().min(0),
  updated: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  rows: z.array(monitoringImportRowResultSchema),
  importedAt: z.string(),
});
export type MonitoringImportResponse = z.infer<typeof monitoringImportResponseSchema>;

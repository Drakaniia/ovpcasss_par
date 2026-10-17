import { z } from 'zod';

import { REPORT_TYPES } from '../domain/enums';

export const monitoringExportRequestSchema = z.object({
  type: z.enum(REPORT_TYPES),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  semester: z.union([z.literal(1), z.literal(2)]),
  includeInProgress: z.boolean().default(false),
});
export type MonitoringExportRequest = z.infer<typeof monitoringExportRequestSchema>;

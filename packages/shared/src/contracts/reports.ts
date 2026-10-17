import { z } from 'zod';

import { CLASSIFICATIONS, LEVELS, REPORT_TYPES } from '../domain/enums';
import { idSchema } from './common';

export const reportFormSchema = z.object({
  type: z.enum(REPORT_TYPES),
  classification: z.enum(CLASSIFICATIONS),
  campusId: idSchema,
  unitId: idSchema,
  department: z.string().max(120).optional(),
  office: z.string().max(120).optional(),
  level: z.enum(LEVELS),
  title: z.string().min(1).max(300),
  activityStartDate: z.string().min(1),
  activityEndDate: z.string().min(1),
  location: z.string().min(1).max(300),
  totalStudents: z.number().int().min(0),
  totalPic: z.number().int().min(0),
  picNames: z.array(z.string().min(1).max(200)).min(1),
  picContact: z.string().min(1).max(200),
  sdgIds: z.array(idSchema).min(1),
  narrative: z.string().min(1),
});
export type ReportFormInput = z.infer<typeof reportFormSchema>;

/** Local or server-side draft. Field values live in `form` so drafts survive schema changes. */
export interface ReportDraft {
  id: string;
  version: number;
  updatedAt: string;
  form: ReportFormInput;
}

export const returnReportSchema = z.object({
  comments: z.string().min(1).max(4000),
});
export type ReturnReportInput = z.infer<typeof returnReportSchema>;

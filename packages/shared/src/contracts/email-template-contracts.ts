import { z } from 'zod';

import { EMAIL_KINDS, type EmailKind } from './email';
import { EMAIL_TOKENS } from './email-template-catalogue';
import { emailTemplateCopySchema } from './email-templates';

/* ------------------------------------------------------------------------- */
/* API contracts                                                              */
/* ------------------------------------------------------------------------- */

export const emailTokenOptionSchema = z.object({
  token: z.enum(EMAIL_TOKENS),
  label: z.string(),
  example: z.string(),
});
export type EmailTokenOption = z.infer<typeof emailTokenOptionSchema>;

export const emailTemplateSummarySchema = z.object({
  kind: z.enum(EMAIL_KINDS),
  label: z.string(),
  audience: z.string(),
  edited: z.boolean(),
  /** A stored row that no longer parses; the built-in copy is in use. */
  unreadable: z.boolean(),
  subject: z.string(),
  updatedAt: z.string().nullable(),
  updatedByName: z.string().nullable(),
});
export type EmailTemplateSummary = z.infer<typeof emailTemplateSummarySchema>;

export const emailTemplateListResponseSchema = z.object({
  items: z.array(emailTemplateSummarySchema),
});
export type EmailTemplateListResponse = z.infer<typeof emailTemplateListResponseSchema>;

export const emailTemplateDetailSchema = z.object({
  kind: z.enum(EMAIL_KINDS),
  label: z.string(),
  audience: z.string(),
  edited: z.boolean(),
  unreadable: z.boolean(),
  copy: emailTemplateCopySchema,
  defaults: emailTemplateCopySchema,
  tokens: z.array(emailTokenOptionSchema),
  branches: z.array(z.object({ key: z.string(), label: z.string() })),
  hasFacts: z.boolean(),
  factsSource: z.enum(['fixed', 'failures']),
  hasQuote: z.boolean(),
  hasAction: z.boolean(),
  updatedAt: z.string().nullable(),
  updatedByName: z.string().nullable(),
});
export type EmailTemplateDetail = z.infer<typeof emailTemplateDetailSchema>;

export const emailTemplateDetailResponseSchema = z.object({
  template: emailTemplateDetailSchema,
});
export type EmailTemplateDetailResponse = z.infer<typeof emailTemplateDetailResponseSchema>;

export const emailTemplateRestoreAllResponseSchema = z.object({
  restored: z.number().int().min(0),
});
export type EmailTemplateRestoreAllResponse = z.infer<typeof emailTemplateRestoreAllResponseSchema>;

export const emailTemplatePreviewInputSchema = z.object({
  copy: emailTemplateCopySchema,
  format: z.enum(['html', 'text']).optional(),
});
export type EmailTemplatePreviewInput = z.infer<typeof emailTemplatePreviewInputSchema>;

export const emailTemplatePreviewResponseSchema = z.object({
  subject: z.string(),
  html: z.string(),
  text: z.string(),
});
export type EmailTemplatePreviewResponse = z.infer<typeof emailTemplatePreviewResponseSchema>;

/** The save body; the copy is validated against its kind by the route. */
export const emailTemplateSaveInputSchema = z.object({
  copy: emailTemplateCopySchema,
});
export type EmailTemplateSaveInput = z.infer<typeof emailTemplateSaveInputSchema>;

export function isEmailKind(value: string): value is EmailKind {
  return (EMAIL_KINDS as readonly string[]).includes(value);
}

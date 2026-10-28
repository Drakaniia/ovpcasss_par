import { z } from 'zod';

import { isoDateTimeSchema } from './common';
import { emailSchema } from './auth';
import { monitoringExportRequestSchema } from './exports';

/**
 * Outbox vocabulary (email spec §5, §12). This is deliberately separate from
 * `NOTIFICATION_KINDS`: the inbox has one `ACCOUNT` chip because a disabled
 * account cannot read its own inbox, while the outbox records the exact mail
 * that was sent. The labels are what the admin log prints.
 */
export const EMAIL_KINDS = [
  'ASSIGNED',
  'SUBMITTED',
  'RETURNED',
  'APPROVED',
  'RECEIPT_ISSUED',
  'RECORD_EDITED',
  'REMINDER',
  'WORKBOOK',
  'FAILURE_DIGEST',
  'VERIFY',
  'RESET',
  'ROLE_ASSIGNED',
  'ACCOUNT_ACTIVATED',
  'ACCOUNT_DISABLED',
  'PIC_REMOVED',
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_KIND_LABELS: Record<EmailKind, string> = {
  ASSIGNED: 'Assigned',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
  RECEIPT_ISSUED: 'Receipt issued',
  RECORD_EDITED: 'Details corrected',
  REMINDER: 'Reminder',
  WORKBOOK: 'Workbook',
  FAILURE_DIGEST: 'Failure digest',
  VERIFY: 'Verify',
  RESET: 'Reset',
  ROLE_ASSIGNED: 'Role assigned',
  ACCOUNT_ACTIVATED: 'Account activated',
  ACCOUNT_DISABLED: 'Account disabled',
  PIC_REMOVED: 'Removed as PIC',
};

/** Final states are `SENT`, `FAILED`, and `SUPPRESSED` (email spec §9.2). */
export const EMAIL_DELIVERY_STATUSES = ['QUEUED', 'SENT', 'FAILED', 'SUPPRESSED'] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];

export const EMAIL_DELIVERY_STATUS_LABELS: Record<EmailDeliveryStatus, string> = {
  QUEUED: 'Queued',
  SENT: 'Sent',
  FAILED: 'Failed',
  SUPPRESSED: 'Suppressed',
};

/** Mute categories (email spec §8). Account mail has no category: it cannot be muted. */
export const EMAIL_PREFERENCE_CATEGORIES = ['WORKFLOW', 'REMINDER'] as const;
export type EmailPreferenceCategory = (typeof EMAIL_PREFERENCE_CATEGORIES)[number];

/**
 * Which mute covers which kind. `null` means the kind is never mutable: an
 * account notice, a workbook the user sent themselves, or an operational digest.
 */
export const EMAIL_KIND_CATEGORIES: Record<EmailKind, EmailPreferenceCategory | null> = {
  ASSIGNED: 'WORKFLOW',
  SUBMITTED: 'WORKFLOW',
  RETURNED: 'WORKFLOW',
  APPROVED: 'WORKFLOW',
  RECEIPT_ISSUED: 'WORKFLOW',
  RECORD_EDITED: 'WORKFLOW',
  REMINDER: 'REMINDER',
  WORKBOOK: null,
  FAILURE_DIGEST: null,
  VERIFY: null,
  RESET: null,
  ROLE_ASSIGNED: null,
  ACCOUNT_ACTIVATED: null,
  ACCOUNT_DISABLED: null,
  PIC_REMOVED: 'WORKFLOW',
};

export const emailPreferencesSchema = z.object({
  workflow: z.boolean(),
  reminders: z.boolean(),
});
export type EmailPreferences = z.infer<typeof emailPreferencesSchema>;

/** `account` is always true; it is reported so the UI can say why it has no switch. */
export const emailPreferencesResponseSchema = emailPreferencesSchema.extend({
  account: z.literal(true),
});
export type EmailPreferencesResponse = z.infer<typeof emailPreferencesResponseSchema>;

export const emailPreferencesInputSchema = emailPreferencesSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Choose at least one email preference.',
  });
export type EmailPreferencesInput = z.infer<typeof emailPreferencesInputSchema>;

/** URL state for the admin log, mirroring every other table (phase 17 §2). */
export const emailLogQuerySchema = z.object({
  status: z.enum(EMAIL_DELIVERY_STATUSES).optional(),
  kind: z.enum(EMAIL_KINDS).optional(),
  to: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(50),
});
export type EmailLogQuery = z.input<typeof emailLogQuerySchema>;

/**
 * One log row. `lastError` carries either the delivery error or the suppression
 * reason (email spec §9.2); `subject` comes from the stored payload, never from
 * a re-render of current state.
 */
export const emailLogRowSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(EMAIL_KINDS),
  to: z.string().min(1),
  subject: z.string(),
  status: z.enum(EMAIL_DELIVERY_STATUSES),
  attempts: z.number().int().min(0),
  lastError: z.string().nullable(),
  reportId: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  /** True when the stored reference can be re-sent (failed and suppressed rows). */
  canResend: z.boolean(),
});
export type EmailLogRow = z.infer<typeof emailLogRowSchema>;

export const emailLogResponseSchema = z.object({
  items: z.array(emailLogRowSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
  /** Unfiltered figures for the failure callout. */
  counts: z.object({
    failed: z.number().int().min(0),
    suppressed: z.number().int().min(0),
  }),
});
export type EmailLogResponse = z.infer<typeof emailLogResponseSchema>;

/**
 * The stored copy of one message, read by an administrator while mail cannot be
 * delivered and a verification or reset link has to be handed over by other
 * means (email spec §9.4). `text` is the message as it was written, never a
 * re-render of current state.
 */
export const emailMessageResponseSchema = z.object({
  to: z.string().min(1),
  subject: z.string(),
  text: z.string(),
});
export type EmailMessageResponse = z.infer<typeof emailMessageResponseSchema>;

/**
 * Workbook mailing (email spec §11.1). The export request is the same shape as
 * the download, so the mailed file cannot describe a different sheet.
 */
export const sendWorkbookSchema = monitoringExportRequestSchema.extend({
  to: z
    .array(emailSchema)
    .min(1, 'Add at least one recipient.')
    .max(5, 'Add at most five recipients.'),
  note: z.string().trim().max(500).optional(),
});
export type SendWorkbookInput = z.infer<typeof sendWorkbookSchema>;

export const sendWorkbookResponseSchema = z.object({ queued: z.number().int().min(0) });
export type SendWorkbookResponse = z.infer<typeof sendWorkbookResponseSchema>;

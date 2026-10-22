import { z } from 'zod';

import { REPORT_STATUSES, REPORT_TYPES } from '../domain/enums';
import { idSchema, isoDateTimeSchema } from './common';

/**
 * Aggregated work-inbox payload (UI spec §7.3). The server resolves the counts
 * for the signed-in account; the client renders at most three rows per section
 * and never derives a total from the rows it received.
 */
export const inboxItemSchema = z.object({
  id: idSchema,
  trackingNumber: z.string().nullable(),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  status: z.enum(REPORT_STATUSES),
  updatedAt: isoDateTimeSchema,
  submittedAt: isoDateTimeSchema.nullable().optional(),
  /** Draft-only: share of required fields completed, 0–100. */
  completeness: z.number().int().min(0).max(100).nullable().optional(),
  /** The caller submitted this report; as an administrator it may still decide it. */
  isOwn: z.boolean().optional(),
});
export type InboxItem = z.infer<typeof inboxItemSchema>;

export const inboxSectionSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(inboxItemSchema).max(3),
});
export type InboxSection = z.infer<typeof inboxSectionSchema>;

/** Report events that reach the submitter's recent activity. */
export const INBOX_ACTIVITY_KINDS = [
  'SUBMITTED',
  'RESUBMITTED',
  'RETURNED_BY_REVIEWER',
  'RETURNED_BY_APPROVER',
  'ENDORSED',
  'APPROVED',
] as const;
export type InboxActivityKind = (typeof INBOX_ACTIVITY_KINDS)[number];

export const inboxActivitySchema = z.object({
  id: idSchema,
  reportId: idSchema,
  trackingNumber: z.string().nullable(),
  title: z.string().min(1),
  kind: z.enum(INBOX_ACTIVITY_KINDS),
  occurredAt: isoDateTimeSchema,
});
export type InboxActivity = z.infer<typeof inboxActivitySchema>;

export const inboxAuditEventSchema = z.object({
  id: idSchema,
  summary: z.string().min(1),
  occurredAt: isoDateTimeSchema,
});
export type InboxAuditEvent = z.infer<typeof inboxAuditEventSchema>;

/** Admin-only block; null for every other role. */
export const inboxAdminSchema = z.object({
  failedEmails: z.number().int().min(0),
  auditEvents: z.array(inboxAuditEventSchema).max(3),
});
export type InboxAdmin = z.infer<typeof inboxAdminSchema>;

/** Server-owned checklist state (derived spec, phase 02 §5). */
export const inboxOnboardingSchema = z.object({
  profileComplete: z.boolean(),
  hasSubmitted: z.boolean(),
  draftId: idSchema.nullable(),
});
export type InboxOnboarding = z.infer<typeof inboxOnboardingSchema>;

export const inboxResponseSchema = z.object({
  returned: inboxSectionSchema,
  review: inboxSectionSchema,
  approval: inboxSectionSchema,
  drafts: inboxSectionSchema,
  waiting: inboxSectionSchema,
  activity: z.array(inboxActivitySchema).max(5),
  /** Decisions the caller recorded; omitted from older payloads. */
  recentlyDecided: z.array(inboxActivitySchema).max(3).optional(),
  /** Bell count for the notifications digest; 0 renders nothing. */
  notificationsUnread: z.number().int().min(0).optional(),
  admin: inboxAdminSchema.nullable(),
  onboarding: inboxOnboardingSchema,
});
export type InboxResponse = z.infer<typeof inboxResponseSchema>;

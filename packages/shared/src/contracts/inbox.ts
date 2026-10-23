import { z } from 'zod';

import { REPORT_STATUSES, REPORT_TYPES } from '../domain/enums';
import { idSchema, isoDateTimeSchema } from './common';

/** One record in a home section; the server already scoped it to the caller. */
export const inboxItemSchema = z.object({
  id: idSchema,
  referenceNo: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  status: z.enum(REPORT_STATUSES),
  activityStartDate: z.string().min(1),
  activityEndDate: z.string().min(1),
  location: z.string(),
  updatedAt: isoDateTimeSchema,
  submittedAt: isoDateTimeSchema.nullable().optional(),
});
export type InboxItem = z.infer<typeof inboxItemSchema>;

export const inboxSectionSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(inboxItemSchema).max(3),
});
export type InboxSection = z.infer<typeof inboxSectionSchema>;

/** Report events that reach the reader's recent activity. */
export const INBOX_ACTIVITY_KINDS = ['SUBMITTED', 'RETURNED', 'APPROVED'] as const;
export type InboxActivityKind = (typeof INBOX_ACTIVITY_KINDS)[number];

export const inboxActivitySchema = z.object({
  id: idSchema,
  reportId: idSchema,
  referenceNo: z.string().min(1),
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

export const inboxResponseSchema = z.object({
  /** ADMIN: narratives waiting for a decision. Empty for PERSONNEL. */
  awaitingReview: inboxSectionSchema,
  /** ADMIN: records created but not yet submitted by their PICs. */
  withPic: inboxSectionSchema,
  /** Both: sent back for revision. */
  returned: inboxSectionSchema,
  /** Both: approved records, newest first. */
  approved: inboxSectionSchema,
  activity: z.array(inboxActivitySchema).max(5),
  recentlyDecided: z.array(inboxActivitySchema).max(3).optional(),
  notificationsUnread: z.number().int().min(0).optional(),
  admin: inboxAdminSchema.nullable(),
});
export type InboxResponse = z.infer<typeof inboxResponseSchema>;

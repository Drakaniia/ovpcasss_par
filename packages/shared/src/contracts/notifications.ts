import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

/**
 * Inbox categories (phase 11 §2). These are inbox categories, not report
 * statuses: the chip carries its own neutral tint and never reuses the
 * `StatusBadge` colours for `SUBMITTED` / `RETURNED_BY_*` / `ENDORSED` /
 * `APPROVED`.
 */
export const NOTIFICATION_KINDS = [
  'SUBMITTED',
  'RESUBMITTED',
  'RETURNED',
  'ENDORSED',
  'APPROVED',
  'REMINDER',
  'ACCOUNT',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  SUBMITTED: 'Submitted',
  RESUBMITTED: 'Resubmitted',
  RETURNED: 'Returned',
  ENDORSED: 'Endorsed',
  APPROVED: 'Approved',
  REMINDER: 'Reminder',
  ACCOUNT: 'Account',
};

/** Inbox filters (phase 11 §2). `action` is work still waiting on the reader. */
export const NOTIFICATION_FILTERS = ['all', 'action', 'reports'] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilter, string> = {
  all: 'All',
  action: 'Needs action',
  reports: 'Mentions my reports',
};

/** Where a row opens. A deleted target falls through to the shared 404 copy. */
export const NOTIFICATION_TARGET_KINDS = [
  'report',
  'review',
  'approval',
  'profile',
  'home',
] as const;
export type NotificationTargetKind = (typeof NOTIFICATION_TARGET_KINDS)[number];

export interface NotificationFlags {
  /** The reader still has work on the target: returned to them, or waiting on them. */
  needsAction: boolean;
  /** The event is on a report the reader submitted. */
  aboutOwnReport: boolean;
}

/**
 * One rule, applied at write time and stored on the row, so the filtered inbox
 * is a column filter instead of a client-side guess. Both flags are independent:
 * a report returned to its submitter is work for them *and* about their report.
 */
export function notificationFlagsFor(kind: NotificationKind): NotificationFlags {
  switch (kind) {
    case 'SUBMITTED':
      return { needsAction: true, aboutOwnReport: false };
    case 'RESUBMITTED':
      return { needsAction: true, aboutOwnReport: false };
    case 'RETURNED':
      return { needsAction: true, aboutOwnReport: true };
    case 'ENDORSED':
      return { needsAction: true, aboutOwnReport: false };
    case 'APPROVED':
      return { needsAction: false, aboutOwnReport: true };
    case 'REMINDER':
      return { needsAction: true, aboutOwnReport: false };
    case 'ACCOUNT':
      return { needsAction: false, aboutOwnReport: false };
  }
}

/** Phase 11 §2 pagination: 50 rows a page, page-local day grouping. */
export const NOTIFICATION_PAGE_SIZE = 50;

export const notificationQuerySchema = z.object({
  filter: z.enum(NOTIFICATION_FILTERS).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(NOTIFICATION_PAGE_SIZE),
});
export type NotificationListQuery = z.infer<typeof notificationQuerySchema>;

/**
 * `description` is a full sentence the server composed when the event happened
 * ("OFF-2026-0014 was returned by M. Santos"), so the client never builds copy
 * from parts it may not have.
 */
export const notificationSchema = z.object({
  id: idSchema,
  kind: z.enum(NOTIFICATION_KINDS),
  description: z.string().min(1),
  /** One-line excerpt of the return comment; null for every other kind. */
  comment: z.string().nullable(),
  target: z.object({
    kind: z.enum(NOTIFICATION_TARGET_KINDS),
    reportId: idSchema.nullable(),
  }),
  readAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
  /** The bell's count, so the badge reconciles on every page load. */
  unreadCount: z.number().int().min(0),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

/** Reads return the fresh count; the badge never has to guess. */
export const notificationReadResponseSchema = z.object({
  notification: notificationSchema,
  unreadCount: z.number().int().min(0),
});
export type NotificationReadResponse = z.infer<typeof notificationReadResponseSchema>;

export const notificationReadAllResponseSchema = z.object({
  markedRead: z.number().int().min(0),
  unreadCount: z.number().int().min(0),
});
export type NotificationReadAllResponse = z.infer<typeof notificationReadAllResponseSchema>;

export const unreadNotificationCountSchema = z.object({
  unreadCount: z.number().int().min(0),
});
export type UnreadNotificationCount = z.infer<typeof unreadNotificationCountSchema>;

/** The bell caps at "9+"; the accessible name always carries the true count. */
export function unreadBadgeLabel(unreadCount: number): string {
  return unreadCount > 9 ? '9+' : String(unreadCount);
}

export function unreadAccessibleLabel(unreadCount: number): string {
  if (unreadCount <= 0) return 'Notifications';
  return `Notifications, ${unreadCount} unread`;
}

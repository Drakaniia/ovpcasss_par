import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const NOTIFICATION_KINDS = [
  'ASSIGNED',
  'SUBMITTED',
  'RETURNED',
  'APPROVED',
  'REMINDER',
  'ACCOUNT',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  ASSIGNED: 'Assigned',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
  REMINDER: 'Reminder',
  ACCOUNT: 'Account',
};

export const NOTIFICATION_FILTERS = ['all', 'action', 'reports'] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilter, string> = {
  all: 'All',
  action: 'Needs action',
  reports: 'Mentions my reports',
};

export const NOTIFICATION_TARGET_KINDS = ['report', 'profile', 'home'] as const;
export type NotificationTargetKind = (typeof NOTIFICATION_TARGET_KINDS)[number];

export interface NotificationFlags {
  needsAction: boolean;
  aboutOwnReport: boolean;
}

export function notificationFlagsFor(kind: NotificationKind): NotificationFlags {
  switch (kind) {
    case 'ASSIGNED':
      return { needsAction: true, aboutOwnReport: true };
    case 'SUBMITTED':
      return { needsAction: true, aboutOwnReport: false };
    case 'RETURNED':
      return { needsAction: true, aboutOwnReport: true };
    case 'APPROVED':
      return { needsAction: false, aboutOwnReport: true };
    case 'REMINDER':
      return { needsAction: true, aboutOwnReport: true };
    case 'ACCOUNT':
      return { needsAction: false, aboutOwnReport: false };
  }
}

export const NOTIFICATION_PAGE_SIZE = 50;

export const notificationQuerySchema = z.object({
  filter: z.enum(NOTIFICATION_FILTERS).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(NOTIFICATION_PAGE_SIZE),
});
export type NotificationListQuery = z.infer<typeof notificationQuerySchema>;

export const notificationSchema = z.object({
  id: idSchema,
  kind: z.enum(NOTIFICATION_KINDS),
  description: z.string().min(1),
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
  unreadCount: z.number().int().min(0),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

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

export function unreadBadgeLabel(unreadCount: number): string {
  return unreadCount > 9 ? '9+' : String(unreadCount);
}

export function unreadAccessibleLabel(unreadCount: number): string {
  if (unreadCount <= 0) return 'Notifications';
  return `Notifications, ${unreadCount} unread`;
}

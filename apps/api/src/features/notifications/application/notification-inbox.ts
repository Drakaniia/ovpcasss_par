import type {
  NotificationListQuery,
  NotificationListResponse,
  NotificationReadAllResponse,
  NotificationReadResponse,
  UnreadNotificationCount,
} from '@par/shared';

import { toClientNotification } from '../domain/notification';
import type { NotificationRepository } from '../infrastructure/notification-repository';

/**
 * Read side of the inbox (UI spec §7.13). The repository holds the SQL and the
 * scoping; these use cases shape the responses the client contract describes.
 */
export async function listNotifications(
  repository: NotificationRepository,
  userId: string,
  query: NotificationListQuery,
): Promise<NotificationListResponse> {
  const page = await repository.listForUser(userId, query.filter, query.page, query.size);

  return {
    items: page.items.map(toClientNotification),
    total: page.total,
    page: query.page,
    size: query.size,
    unreadCount: page.unreadCount,
  };
}

/** Null when the row is not the caller's, which the route turns into a 404. */
export async function readNotification(
  repository: NotificationRepository,
  userId: string,
  id: string,
  at: string,
): Promise<NotificationReadResponse | null> {
  const record = await repository.markRead(userId, id, at);
  if (!record) return null;

  return {
    notification: toClientNotification(record),
    unreadCount: await repository.countUnread(userId),
  };
}

export async function readAllNotifications(
  repository: NotificationRepository,
  userId: string,
  at: string,
): Promise<NotificationReadAllResponse> {
  const markedRead = await repository.markAllRead(userId, at);

  return { markedRead, unreadCount: await repository.countUnread(userId) };
}

export async function countUnreadNotifications(
  repository: NotificationRepository,
  userId: string,
): Promise<UnreadNotificationCount> {
  return { unreadCount: await repository.countUnread(userId) };
}

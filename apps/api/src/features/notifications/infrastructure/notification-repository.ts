import type { Database, NotificationRow } from '@par/db';
import { createNotificationQueries } from '@par/db';
import type { NotificationFilter } from '@par/shared';

import type { NotificationRecord } from '../domain/notification';

export interface NotificationPage {
  items: NotificationRecord[];
  total: number;
  /** The reader's whole inbox, not this filter — it is the bell's number. */
  unreadCount: number;
}

/**
 * The port the use cases depend on. Every call is scoped by `userId` in the
 * queries below, so no route can reach another person's inbox.
 */
export interface NotificationRepository {
  insert(record: NotificationRecord): Promise<void>;
  listForUser(
    userId: string,
    filter: NotificationFilter,
    page: number,
    size: number,
  ): Promise<NotificationPage>;
  markRead(userId: string, id: string, at: string): Promise<NotificationRecord | null>;
  markAllRead(userId: string, at: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
}

/** The stored row and the domain record carry the same facts, in layer order. */
function toRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    description: row.description,
    comment: row.comment,
    targetKind: row.targetKind,
    reportId: row.reportId,
    needsAction: row.needsAction,
    aboutOwnReport: row.aboutOwnReport,
    readAt: row.readAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createNotificationRepository(db: Database): NotificationRepository {
  const queries = createNotificationQueries(db);

  return {
    async insert(record) {
      await queries.insert(record);
    },

    async listForUser(userId, filter, page, size) {
      const result = await queries.listForUser(userId, filter, page, size);

      return {
        items: result.rows.map(toRecord),
        total: result.total,
        unreadCount: result.unreadCount,
      };
    },

    async markRead(userId, id, at) {
      const row = await queries.markRead(userId, id, at);
      return row ? toRecord(row) : null;
    },

    markAllRead(userId, at) {
      return queries.markAllRead(userId, at);
    },

    countUnread(userId) {
      return queries.countUnread(userId);
    },
  };
}

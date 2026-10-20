import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';

import type { NotificationFilter } from '@par/shared';

import type { Database } from '../client';
import { notifications } from '../schema/notifications';

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;

export interface NotificationPage {
  rows: NotificationRow[];
  total: number;
  unreadCount: number;
}

/** `action` and `reports` are the two stored flags (phase 11 §2). */
function filterCondition(filter: NotificationFilter): SQL | undefined {
  if (filter === 'action') return eq(notifications.needsAction, true);
  if (filter === 'reports') return eq(notifications.aboutOwnReport, true);
  return undefined;
}

async function count(db: Database, condition: SQL | undefined): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)` })
    .from(notifications)
    .where(condition);

  return Number(rows[0]?.value ?? 0);
}

/**
 * Notification reads and writes (UI spec §7.13). The SQL lives beside the schema
 * so the column names have one owner; the API's repository maps these rows into
 * its own domain records. Every statement is scoped by `user_id`, so one
 * account can never read or mark another account's rows.
 */
export function createNotificationQueries(db: Database) {
  const unread = (userId: string) =>
    and(eq(notifications.userId, userId), isNull(notifications.readAt));

  return {
    async insert(row: NewNotificationRow): Promise<void> {
      await db.insert(notifications).values(row);
    },

    async listForUser(
      userId: string,
      filter: NotificationFilter,
      page: number,
      size: number,
    ): Promise<NotificationPage> {
      const scope = and(eq(notifications.userId, userId), filterCondition(filter));

      const [rows, total, unreadCount] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(scope)
          .orderBy(desc(notifications.createdAt))
          .limit(size)
          .offset((page - 1) * size),
        count(db, scope),
        count(db, unread(userId)),
      ]);

      return { rows, total, unreadCount };
    },

    /** Null when the id is not this reader's, which the route answers with 404. */
    async markRead(userId: string, id: string, at: string): Promise<NotificationRow | null> {
      const owned = and(eq(notifications.userId, userId), eq(notifications.id, id));

      await db.update(notifications).set({ readAt: at, updatedAt: at }).where(owned);

      const rows = await db.select().from(notifications).where(owned).limit(1);
      return rows[0] ?? null;
    },

    async markAllRead(userId: string, at: string): Promise<number> {
      const before = await count(db, unread(userId));
      if (before === 0) return 0;

      await db.update(notifications).set({ readAt: at, updatedAt: at }).where(unread(userId));
      return before;
    },

    async countUnread(userId: string): Promise<number> {
      return count(db, unread(userId));
    },
  };
}

export type NotificationQueries = ReturnType<typeof createNotificationQueries>;

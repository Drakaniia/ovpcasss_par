import { NOTIFICATION_KINDS, NOTIFICATION_TARGET_KINDS } from '@par/shared';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Inbox rows, one per recipient (UI spec §7.13, project spec §7.9). Timestamps
 * are UTC ISO text like every other table.
 *
 * `description` is composed when the event happens — the row says what happened
 * to the reader at the time, and is never re-derived from a report that has
 * since moved on. The two flags come from `notificationFlagsFor` so the
 * "Needs action" filter is a column filter, not a re-derivation per request.
 */
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    kind: text('kind', { enum: NOTIFICATION_KINDS }).notNull(),
    description: text('description').notNull(),
    /** Return comment excerpt shown on a second line; null for every other kind. */
    comment: text('comment'),
    targetKind: text('target_kind', { enum: NOTIFICATION_TARGET_KINDS }).notNull(),
    reportId: text('report_id'),
    needsAction: integer('needs_action', { mode: 'boolean' }).notNull().default(false),
    aboutOwnReport: integer('about_own_report', { mode: 'boolean' }).notNull().default(false),
    /** Null while unread. There is no update path other than marking read. */
    readAt: text('read_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('notifications_user_created_idx').on(table.userId, table.createdAt),
    index('notifications_user_unread_idx').on(table.userId, table.readAt),
  ],
);

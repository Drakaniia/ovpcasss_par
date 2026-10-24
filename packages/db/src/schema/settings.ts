import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Office-wide settings the administrator may change without a deploy
 * (report 9). One row per key; the value is JSON so a setting can grow a
 * shape later without another table. Only the settings the office owns live
 * here — deployment configuration stays in Worker variables.
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
  updatedByUserId: text('updated_by_user_id'),
});

/** The keys this build knows; an unknown key is simply never read. */
export const SETTING_KEYS = ['receipt-signatory'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

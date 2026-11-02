import type { EmailKind } from '@par/shared';
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

/**
 * Editable message copy is one row per outbound kind, so two administrators
 * editing different messages never overwrite each other and each kind carries
 * its own editor and timestamp (email message editor spec §5).
 */
export const EMAIL_TEMPLATE_KEY_PREFIX = 'email-template:';

/** The keys this build knows; an unknown key is simply never read. */
export type SettingKey =
  | 'receipt-signatory'
  | 'email-sender'
  | `${typeof EMAIL_TEMPLATE_KEY_PREFIX}${EmailKind}`;

export type EmailTemplateSettingKey = `${typeof EMAIL_TEMPLATE_KEY_PREFIX}${EmailKind}`;

export function emailTemplateKey(kind: EmailKind): EmailTemplateSettingKey {
  return `${EMAIL_TEMPLATE_KEY_PREFIX}${kind}`;
}

export function isEmailTemplateKey(key: string): key is EmailTemplateSettingKey {
  return key.startsWith(EMAIL_TEMPLATE_KEY_PREFIX);
}

export function emailKindFromKey(key: string): string | null {
  return isEmailTemplateKey(key) ? key.slice(EMAIL_TEMPLATE_KEY_PREFIX.length) : null;
}

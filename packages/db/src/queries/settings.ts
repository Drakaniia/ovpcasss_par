import { eq, like } from 'drizzle-orm';

import type { Database } from '../client';
import { settings, type SettingKey } from '../schema/settings';

export type SettingsRow = typeof settings.$inferSelect;

/**
 * Settings rows (report 9). The value is JSON, so a caller reads a typed object
 * and an unknown or corrupt row is treated as absent rather than crashing a
 * render. Writes are upserts: the administrator edits one key at a time.
 */
export function createSettingsQueries(db: Database) {
  return {
    async get<T>(key: SettingKey): Promise<T | null> {
      const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      const row = rows[0];
      if (!row) return null;

      try {
        return JSON.parse(row.value) as T;
      } catch {
        return null;
      }
    },

    /** Every row under one prefix, in one read (the 15 message copies). */
    async listByPrefix(prefix: string): Promise<SettingsRow[]> {
      return db.select().from(settings).where(like(settings.key, `${prefix}%`));
    },

    async delete(key: SettingKey): Promise<void> {
      await db.delete(settings).where(eq(settings.key, key));
    },

    /** Restore every message at once; returns how many rows were removed. */
    async deleteByPrefix(prefix: string): Promise<number> {
      const removed = await db
        .delete(settings)
        .where(like(settings.key, `${prefix}%`))
        .returning({ key: settings.key });
      return removed.length;
    },

    async put(input: {
      key: SettingKey;
      value: unknown;
      now: string;
      updatedByUserId: string;
    }): Promise<void> {
      await db
        .insert(settings)
        .values({
          key: input.key,
          value: JSON.stringify(input.value),
          updatedAt: input.now,
          updatedByUserId: input.updatedByUserId,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: JSON.stringify(input.value),
            updatedAt: input.now,
            updatedByUserId: input.updatedByUserId,
          },
        });
    },
  };
}

export type SettingsQueries = ReturnType<typeof createSettingsQueries>;

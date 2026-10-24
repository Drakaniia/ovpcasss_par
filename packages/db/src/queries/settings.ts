import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { settings, type SettingKey } from '../schema/settings';

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

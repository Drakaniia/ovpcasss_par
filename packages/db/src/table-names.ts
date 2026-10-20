import { getTableName, is, Table } from 'drizzle-orm';

import * as schema from './schema';

/**
 * Every table the Drizzle schema knows about, alphabetically. Derived rather
 * than listed so a new table cannot silently drop out of the daily export
 * (apps/api/src/cron/backup.ts) or any other whole-schema job.
 */
export function schemaTableNames(): string[] {
  const values: unknown[] = Object.values(schema);

  return values
    .filter((value): value is Table => is(value, Table))
    .map((table) => getTableName(table))
    .sort();
}

import { schemaTableNames } from '@par/db';

/**
 * Daily D1 export (spec §10). D1 Time Travel is the first restore path; this is
 * the second copy, written as newline-delimited JSON per table so it can be
 * inspected with any text tool and replayed row by row without a D1 import.
 *
 * The table list is derived from the Drizzle schema, so a new table is exported
 * without anyone remembering to add it, and every read is paged so a single
 * Worker invocation does not hold a whole table in memory at once.
 */
export const BACKUP_PREFIX = 'backups/d1';
export const BACKUP_PAGE_SIZE = 500;

/** Alphabetical, from the schema. Interpolated into SQL only because it is code. */
export const BACKUP_TABLES = schemaTableNames();

export interface BackupDb {
  prepare(query: string): {
    all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  };
}

export interface BackupBucket {
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

export interface BackupResult {
  tables: number;
  rows: number;
}

/** `backups/d1/2026-10-19/users.ndjson` — one day's snapshot, one object per table. */
export function backupObjectKey(now: Date, table: string): string {
  const day = now.toISOString().slice(0, 10);
  return `${BACKUP_PREFIX}/${day}/${table}.ndjson`;
}

function pageQuery(table: string, limit: number, offset: number): string {
  return `SELECT * FROM "${table}" LIMIT ${limit} OFFSET ${offset}`;
}

async function readTable(db: BackupDb, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (let offset = 0; ; offset += BACKUP_PAGE_SIZE) {
    const page = await db.prepare(pageQuery(table, BACKUP_PAGE_SIZE, offset)).all();
    const batch = page.results ?? [];
    rows.push(...batch);

    if (batch.length < BACKUP_PAGE_SIZE) return rows;
  }
}

function toNdjson(rows: Record<string, unknown>[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n');
}

export async function runBackup(
  sources: { db: BackupDb; bucket: BackupBucket },
  now: Date,
): Promise<BackupResult> {
  const failures: string[] = [];
  let tables = 0;
  let rows = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const tableRows = await readTable(sources.db, table);
      await sources.bucket.put(backupObjectKey(now, table), toNdjson(tableRows), {
        httpMetadata: { contentType: 'application/x-ndjson' },
      });

      tables += 1;
      rows += tableRows.length;
    } catch (error) {
      // One unreadable table must not cost the other twenty-two their copy.
      failures.push(table);
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Table could not be exported',
          table,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(`The backup is incomplete: ${failures.join(', ')}`);
  }

  return { tables, rows };
}

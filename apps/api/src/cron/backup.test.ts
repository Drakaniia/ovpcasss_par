import { describe, expect, it } from 'vitest';

import {
  BACKUP_PAGE_SIZE,
  BACKUP_TABLES,
  backupObjectKey,
  runBackup,
  type BackupDb,
} from './backup';

const NOW = new Date('2026-10-19T18:30:00.000Z');

/** A D1 stand-in that returns the pages queued for each table. */
function fakeDb(pages: Record<string, Record<string, unknown>[][]>) {
  const queries: string[] = [];

  const db: BackupDb = {
    prepare(query) {
      queries.push(query);
      const table = /FROM "([^"]+)"/.exec(query)?.[1] ?? '';
      const offset = Number(/OFFSET (\d+)/.exec(query)?.[1] ?? '0');
      const index = Math.floor(offset / BACKUP_PAGE_SIZE);
      const results = pages[table]?.[index] ?? [];

      return {
        all: async <T = Record<string, unknown>>(): Promise<{ results?: T[] }> => ({
          results: results as T[],
        }),
      };
    },
  };

  return { db, queries };
}

function fakeBucket() {
  const objects = new Map<string, string>();
  return {
    objects,
    put: async (key: string, value: string) => {
      objects.set(key, value);
    },
  };
}

describe('daily D1 backup', () => {
  it('derives the table list from the schema', () => {
    expect(BACKUP_TABLES).toContain('reports');
    expect(BACKUP_TABLES).toContain('audit_events');
    expect([...BACKUP_TABLES]).toEqual([...BACKUP_TABLES].sort());
  });

  it('only interpolates safe table identifiers into SQL', () => {
    for (const table of BACKUP_TABLES) {
      expect(table).toMatch(/^[a-z_]+$/);
    }
  });

  it('keys one object per table per day', () => {
    expect(backupObjectKey(NOW, 'reports')).toBe('backups/d1/2026-10-19/reports.ndjson');
  });

  it('pages a table until a short page and writes newline-delimited JSON', async () => {
    const first = Array.from({ length: BACKUP_PAGE_SIZE }, (_, index) => ({ id: `r-${index}` }));
    const second = [{ id: 'r-last' }];
    const { db, queries } = fakeDb({ reports: [first, second] });
    const bucket = fakeBucket();

    const result = await runBackup({ db, bucket }, NOW);

    const reportQueries = queries.filter((query) => query.includes('"reports"'));
    expect(reportQueries).toHaveLength(2);
    expect(reportQueries[0]).toContain('LIMIT 500 OFFSET 0');
    expect(reportQueries[1]).toContain('LIMIT 500 OFFSET 500');

    const body = bucket.objects.get('backups/d1/2026-10-19/reports.ndjson') ?? '';
    expect(body.split('\n')).toHaveLength(BACKUP_PAGE_SIZE + 1);
    expect(body.endsWith('{"id":"r-last"}')).toBe(true);

    expect(result.rows).toBe(BACKUP_PAGE_SIZE + 1);
    expect(result.tables).toBe(BACKUP_TABLES.length);
  });

  it('fails loudly when a table could not be exported', async () => {
    const db: BackupDb = {
      prepare(query) {
        if (query.includes('"audit_events"')) throw new Error('D1 read failed');
        return { all: async () => ({ results: [] }) };
      },
    };

    await expect(runBackup({ db, bucket: fakeBucket() }, NOW)).rejects.toThrow(
      'incomplete: audit_events',
    );
  });
});

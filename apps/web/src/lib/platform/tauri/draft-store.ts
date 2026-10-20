import type { ReportDraft } from '@par/shared';
import Database from '@tauri-apps/plugin-sql';

import type { DraftStore } from '../contracts';

/**
 * Local drafts on SQLite (`sqlite:par-drafts.db`) through the Tauri SQL plugin
 * (phase 15 §1). The database lives in the app-data directory the plugin owns,
 * so a draft survives a restart. The row body is the same `ReportDraft` the
 * IndexedDB store keeps, which is what makes the two shells interchangeable.
 */
const DATABASE_URL = 'sqlite:par-drafts.db';

async function open(): Promise<Database> {
  const database = await Database.load(DATABASE_URL);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return database;
}

let database: Promise<Database> | null = null;

function connect(): Promise<Database> {
  database ??= open().catch((error: unknown) => {
    // A failed open must not poison every later call.
    database = null;
    throw error;
  });
  return database;
}

function parse(data: string): ReportDraft {
  return JSON.parse(data) as ReportDraft;
}

export function createDraftStore(): DraftStore {
  return {
    async list() {
      const db = await connect();
      const rows = await db.select<{ data: string }[]>(
        'SELECT data FROM drafts ORDER BY updated_at DESC',
      );
      return rows.map((row) => parse(row.data));
    },

    async get(id) {
      const db = await connect();
      const rows = await db.select<{ data: string }[]>(
        'SELECT data FROM drafts WHERE id = $1 LIMIT 1',
        [id],
      );
      const row = rows[0];
      return row ? parse(row.data) : null;
    },

    async put(draft) {
      const db = await connect();
      await db.execute(
        `INSERT INTO drafts (id, data, updated_at) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        [draft.id, JSON.stringify(draft), draft.updatedAt],
      );
    },

    async remove(id) {
      const db = await connect();
      await db.execute('DELETE FROM drafts WHERE id = $1', [id]);
    },
  };
}

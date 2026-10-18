import type { ReportDraft } from '@par/shared';

import type { DraftStore } from '../contracts';

/**
 * Web drafts live in IndexedDB so a reload never loses work (spec §6, UI phase
 * 06). The Tauri store replaces this behind the same interface.
 */
const DB_NAME = 'par-drafts';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'));
  });
}

function resultOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

/** Used only when the shell has no IndexedDB (SSR, tests, private-mode failures). */
function createMemoryStore(): DraftStore {
  const drafts = new Map<string, ReportDraft>();

  return {
    async list() {
      return [...drafts.values()];
    },
    async get(id) {
      return drafts.get(id) ?? null;
    },
    async put(draft) {
      drafts.set(draft.id, draft);
    },
    async remove(id) {
      drafts.delete(id);
    },
  };
}

export function createDraftStore(): DraftStore {
  const memory = createMemoryStore();
  let database: Promise<IDBDatabase | null> | null = null;

  function open(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    // A blocked or failed open degrades to memory instead of breaking the form.
    database ??= openDatabase().catch(() => null);
    return database;
  }

  return {
    async list() {
      const db = await open();
      if (!db) return memory.list();

      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const drafts = (await resultOf(store.getAll())) as ReportDraft[];
      return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async get(id) {
      const db = await open();
      if (!db) return memory.get(id);

      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      return ((await resultOf(store.get(id))) as ReportDraft | undefined) ?? null;
    },

    async put(draft) {
      const db = await open();
      if (!db) return memory.put(draft);

      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await resultOf(store.put(draft));
    },

    async remove(id) {
      const db = await open();
      if (!db) return memory.remove(id);

      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await resultOf(store.delete(id));
    },
  };
}

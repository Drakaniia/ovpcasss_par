/**
 * In-memory cache for reads (spec §5). A page that was already opened keeps its
 * answer, so going back to it paints the record instead of a skeleton.
 *
 * Nothing is written to browser storage: the cache lives for one document, and
 * signing out, switching account, or any write through the API drops it. The
 * two windows below are the ones TanStack Query calls `staleTime` and `gcTime`;
 * the names are kept so the trade-off stays recognisable.
 */

/** A read younger than this is served without asking the API again. */
export const STALE_TIME = 30_000;

/** A read unused for this long is dropped rather than kept in memory. */
export const GC_TIME = 5 * 60_000;

/** The most reads held at once; the least recently used leaves first. */
const MAX_ENTRIES = 60;

interface Entry {
  value: unknown;
  storedAt: number;
  usedAt: number;
}

export interface CachedRead<T> {
  value: T;
  /** Older than `STALE_TIME`: hand it over now, refresh it for the next visit. */
  stale: boolean;
}

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Bumped by every invalidation, so a read that started earlier writes nothing. */
let generation = 0;

/** Drops what nobody has read for `GC_TIME`, then trims the oldest surplus. */
function evict(now: number): void {
  for (const [key, entry] of entries) {
    if (now - entry.usedAt > GC_TIME) entries.delete(key);
  }

  // Map keeps insertion order and every read re-inserts its key, so the first
  // key is the least recently used.
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next();
    if (oldest.done) break;
    entries.delete(oldest.value);
  }
}

/** The stored answer for a read, if there is one. Marks the entry as used. */
export function readCached<T>(key: string): CachedRead<T> | undefined {
  const now = Date.now();
  evict(now);

  const entry = entries.get(key);
  if (!entry) return undefined;

  entries.delete(key);
  entry.usedAt = now;
  entries.set(key, entry);

  return { value: entry.value as T, stale: now - entry.storedAt >= STALE_TIME };
}

/**
 * The cached answer when there is one, otherwise the loader's. Concurrent
 * callers of the same key share one request, which is what keeps a page that
 * asks for the same reference list three times from sending three reads.
 */
export function cacheRead<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = readCached<T>(key);

  if (cached) {
    if (cached.stale) void refresh(key, loader);
    return Promise.resolve(cached.value);
  }

  return store(key, loader);
}

/** Loads and stores one read; an in-flight copy of it is reused. */
function store<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const started = generation;
  const promise = loader()
    .then((value) => {
      // A write may have landed while this read was in flight; the answer is
      // then older than the invalidation and must not repopulate the cache.
      if (started === generation) {
        const now = Date.now();
        entries.delete(key);
        entries.set(key, { value, storedAt: now, usedAt: now });
        evict(now);
      }
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Replaces a stale entry for the next visit. The reader already has its value,
 * so a failed refresh is silent: the next visit asks again.
 */
function refresh<T>(key: string, loader: () => Promise<T>): Promise<void> {
  return store(key, loader).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Drops every read. Called when the account changes and whenever a write goes
 * through the API: the client cannot know which reads a write made wrong, so
 * the next read asks the server instead of trusting what it had.
 */
export function invalidateReadCache(): void {
  generation += 1;
  entries.clear();
  inflight.clear();
}

/**
 * First-run tour state (onboarding spec §9). One record per account in
 * `localStorage`, so two people on one machine each see the tour once. A record
 * only counts at the current version, which is how a copy change re-arms the
 * tour once for everybody. A blocked, missing or corrupt store reads as "no
 * record": nothing here may throw into the shell.
 */
export const TOUR_VERSION = 1;
export const TOUR_KEY_PREFIX = 'par.onboarding.tour';

export type TourOutcome = 'completed' | 'skipped';

export type TourRecord = {
  version: number;
  outcome: TourOutcome;
  /** ISO UTC; never displayed in this feature. */
  at: string;
};

/** The slice of `Storage` the tour needs, so tests can pass a `Map`-backed fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function tourKey(userId: string): string {
  return `${TOUR_KEY_PREFIX}.${userId}`;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access to the storage area can itself throw when cookies are blocked.
    return null;
  }
}

function isRecord(value: unknown): value is TourRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const record = value as Partial<TourRecord>;
  return (
    record.version === TOUR_VERSION &&
    (record.outcome === 'completed' || record.outcome === 'skipped') &&
    typeof record.at === 'string'
  );
}

export function readTourRecord(
  userId: string,
  storage: StorageLike | null = defaultStorage(),
): TourRecord | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(tourKey(userId));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Both outcomes suppress the automatic tour; only Help can replay it. */
export function isTourComplete(
  userId: string,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  return readTourRecord(userId, storage) !== null;
}

export function writeTourOutcome(
  userId: string,
  outcome: TourOutcome,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;

  const record: TourRecord = { version: TOUR_VERSION, outcome, at: new Date().toISOString() };

  try {
    storage.setItem(tourKey(userId), JSON.stringify(record));
  } catch {
    // A full or blocked store costs the memory, never the current session.
  }
}

export function clearTourRecord(
  userId: string,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;

  try {
    storage.removeItem(tourKey(userId));
  } catch {
    // Nothing to report: the caller mirrors the state in memory anyway.
  }
}

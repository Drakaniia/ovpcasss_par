import type { LocationSuggestion } from '@par/shared';

/** One readable line, trimmed, inside the form's 300-character limit. */
export function normalizeLocation(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/**
 * Up to eight suggestions, newest first, deduplicated case-insensitively.
 * Prefix matches come before substring matches; within each group the most
 * recently used location leads (bug phase 04 §3.1).
 */
export function rankLocations(
  items: readonly LocationSuggestion[],
  query: string,
  limit = 8,
): LocationSuggestion[] {
  const needle = normalizeLocation(query).toLowerCase();
  const seen = new Map<string, LocationSuggestion>();

  for (const item of items) {
    const location = normalizeLocation(item.location);
    if (!location) continue;

    const key = location.toLowerCase();
    if (seen.has(key)) continue;
    if (needle && !key.includes(needle)) continue;

    seen.set(key, {
      ...item,
      location,
    });
  }

  const entries = [...seen.values()];
  const prefixes = entries.filter((entry) =>
    normalizeLocation(entry.location).toLowerCase().startsWith(needle),
  );
  const substrings = entries.filter(
    (entry) => !normalizeLocation(entry.location).toLowerCase().startsWith(needle),
  );

  return [...prefixes, ...substrings].slice(0, limit);
}

/**
 * Drops the history rows this account removed. Address rows always survive: a
 * provider result is not ours to forget, and it never appears twice.
 */
export function withoutHiddenLocations(
  items: readonly LocationSuggestion[],
  hidden: readonly string[],
): LocationSuggestion[] {
  if (hidden.length === 0) return [...items];

  const gone = new Set(hidden.map((value) => normalizeLocation(value).toLowerCase()));

  return items.filter(
    (item) => item.source !== 'office' || !gone.has(normalizeLocation(item.location).toLowerCase()),
  );
}

/** Office history leads; an address suggestion never displaces it. */
export function mergeSuggestions(
  office: readonly LocationSuggestion[],
  address: readonly LocationSuggestion[],
  limit = 8,
): LocationSuggestion[] {
  const seen = new Set<string>();
  const merged: LocationSuggestion[] = [];

  for (const item of [...office, ...address]) {
    const location = normalizeLocation(item.location);
    if (!location) continue;

    const key = location.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push({ ...item, location });
    if (merged.length === limit) break;
  }

  return merged;
}

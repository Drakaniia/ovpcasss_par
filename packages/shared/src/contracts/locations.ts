import { z } from 'zod';

import { isoDateTimeSchema } from './common';

/**
 * Locations the office already used (bug phase 04 §3.1). The value is plain text
 * — the same string a report stores — so a picked suggestion never becomes an id
 * the printed form would have to resolve.
 */
export const locationSuggestionSchema = z.object({
  location: z.string().min(1),
  /** Absent for a provider address, which the register has never used. */
  lastUsedAt: isoDateTimeSchema.optional(),
  /** `office` is the register's own history; `address` is the optional proxy. */
  source: z.enum(['office', 'address']).default('office'),
});
export type LocationSuggestion = z.infer<typeof locationSuggestionSchema>;

export const locationSuggestionsResponseSchema = z.object({
  items: z.array(locationSuggestionSchema).max(8),
});
export type LocationSuggestionsResponse = z.infer<typeof locationSuggestionsResponseSchema>;

export const locationQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(8).default(8),
});
export type LocationQuery = z.input<typeof locationQuerySchema>;

/**
 * One activity can happen at several venues, and `report.location` is still a
 * single text the register, the exports, and the printed form already read. The
 * venues travel in it separated by this string, oldest reading first.
 */
export const LOCATION_SEPARATOR = '; ';

/** Longest `report.location` the contract accepts. */
export const LOCATION_MAX_LENGTH = 300;

/** Splits a stored location into its venues, trimming and dropping blanks. */
export function splitLocationList(value: string): string[] {
  return value
    .split(';')
    .map((location) => location.trim())
    .filter((location) => location !== '');
}

/** Joins venue rows into the one text a report stores. */
export function joinLocationList(locations: readonly string[]): string {
  return locations
    .map((location) => location.trim())
    .filter((location) => location !== '')
    .join(LOCATION_SEPARATOR);
}

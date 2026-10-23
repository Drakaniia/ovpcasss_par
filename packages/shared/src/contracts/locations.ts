import { z } from 'zod';

import { isoDateTimeSchema } from './common';

/**
 * Locations the office already used (bug phase 04 §3.1). The value is plain text
 * — the same string a report stores — so a picked suggestion never becomes an id
 * the printed form would have to resolve.
 */
export const locationSuggestionSchema = z.object({
  location: z.string().min(1),
  lastUsedAt: isoDateTimeSchema,
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

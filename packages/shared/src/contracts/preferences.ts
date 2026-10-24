import { z } from 'zod';

/**
 * Per-account UI state, kept on the API so every shell and device sees the same
 * settings and nothing is written to browser storage (settings spec §7.14).
 * `zoom` is the desktop webview scale, `updater` the automatic-update choices,
 * and `tour` the onboarding record. Keys are optional: an account that never
 * changed a setting has an empty object.
 */
export const tourRecordSchema = z.object({
  version: z.number().int().nonnegative(),
  outcome: z.enum(['completed', 'skipped']),
  at: z.string(),
});

/** How many removed locations one account may remember. */
export const HIDDEN_LOCATIONS_LIMIT = 100;

/**
 * Locations the account removed from the field's history. The history itself is
 * read from the reports; this only suppresses a row the office no longer needs.
 */
const hiddenLocationsSchema = z
  .array(z.string().trim().min(1).max(300))
  .max(HIDDEN_LOCATIONS_LIMIT);

export const preferencesSchema = z.object({
  zoom: z.number().min(0.5).max(2).optional(),
  updater: z.object({ autoCheck: z.boolean(), autoInstall: z.boolean() }).optional(),
  tour: tourRecordSchema.optional(),
  hiddenLocations: hiddenLocationsSchema.optional(),
});

/**
 * A partial write: only the keys present are replaced, and `tour: null` forgets
 * the onboarding record so the tour arms again.
 */
export const preferencesPatchSchema = z.object({
  zoom: z.number().min(0.5).max(2).optional(),
  updater: z.object({ autoCheck: z.boolean(), autoInstall: z.boolean() }).optional(),
  tour: tourRecordSchema.nullable().optional(),
  hiddenLocations: hiddenLocationsSchema.optional(),
});

export const preferencesResponseSchema = z.object({ preferences: preferencesSchema });

export type TourRecord = z.infer<typeof tourRecordSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;

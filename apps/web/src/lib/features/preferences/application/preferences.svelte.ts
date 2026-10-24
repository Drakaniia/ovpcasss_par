import type { Preferences, PreferencesPatch, TourRecord } from '@par/shared';

import { api } from '$lib/api/client';

/**
 * The account's UI preferences (settings spec §7.14). The API is the only store:
 * the zoom scale, the update choices and the onboarding record are read once
 * when the session resolves and written back on every change, so nothing is
 * kept in browser storage and the same account looks the same in every shell.
 */
export const preferencesState = $state<{ loaded: boolean; value: Preferences }>({
  loaded: false,
  value: {},
});

let inflight: Promise<void> | null = null;

/** Loads once per document; a failure only costs the saved settings. */
export async function loadPreferences(): Promise<void> {
  if (preferencesState.loaded) return;
  if (inflight) return inflight;

  inflight = api.preferences
    .get()
    .then(({ preferences }) => {
      preferencesState.value = preferences;
    })
    .catch(() => undefined)
    .finally(() => {
      preferencesState.loaded = true;
      inflight = null;
    });

  return inflight;
}

/** Sign-out drops the record so the next account never inherits it. */
export function resetPreferences(): void {
  preferencesState.value = {};
  preferencesState.loaded = false;
  inflight = null;
}

export function tourRecord(): TourRecord | null {
  return preferencesState.value.tour ?? null;
}

/** Writes a patch: the local copy moves first, the API catches up. */
export function savePreferences(patch: PreferencesPatch): void {
  const { tour, ...rest } = patch;
  const next: Preferences = { ...preferencesState.value, ...rest };
  if (tour === null) delete next.tour;
  else if (tour) next.tour = tour;
  preferencesState.value = next;

  void api.preferences.save(patch).catch(() => undefined);
}

/** Forgets the onboarding record so the tour arms again for this account. */
export function clearTourRecord(): void {
  savePreferences({ tour: null });
}

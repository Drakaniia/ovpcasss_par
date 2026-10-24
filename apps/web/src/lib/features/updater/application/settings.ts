import {
  preferencesState,
  savePreferences,
} from '$lib/features/preferences/application/preferences.svelte';

export type UpdaterPrefs = {
  autoCheck: boolean;
  autoInstall: boolean;
};

const DEFAULT_PREFS: UpdaterPrefs = { autoCheck: true, autoInstall: true };

/** The account's choices, kept on the API beside the rest of its preferences. */
export function loadUpdaterPrefs(): UpdaterPrefs {
  return { ...DEFAULT_PREFS, ...preferencesState.value.updater };
}

export function saveUpdaterPrefs(prefs: UpdaterPrefs): void {
  savePreferences({ updater: prefs });
}

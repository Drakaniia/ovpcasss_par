export type UpdaterPrefs = {
  autoCheck: boolean;
  autoInstall: boolean;
};

const STORAGE_KEY = 'par.updater.prefs';

const DEFAULT_PREFS: UpdaterPrefs = { autoCheck: true, autoInstall: true };

export function loadUpdaterPrefs(): UpdaterPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFS };

    const parsed = JSON.parse(stored) as Partial<UpdaterPrefs>;
    return {
      autoCheck: parsed.autoCheck ?? DEFAULT_PREFS.autoCheck,
      autoInstall: parsed.autoInstall ?? DEFAULT_PREFS.autoInstall,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveUpdaterPrefs(prefs: UpdaterPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* Storage is unavailable; the preferences apply to this session only. */
  }
}

import { createPlatform } from '$lib/platform';
import type { AvailableUpdate, Updater } from '$lib/platform/contracts';

import { isAppIdle, onIdle, startIdleTracking } from './idle-gate';
import { loadUpdaterPrefs, saveUpdaterPrefs, type UpdaterPrefs } from './settings';

export type UpdaterStatus =
  'idle' | 'checking' | 'downloading' | 'ready' | 'installing' | 'error' | 'up-to-date';

export const updaterState = $state({
  supported: false,
  status: 'idle' as UpdaterStatus,
  currentVersion: '',
  version: '',
  progress: 0,
  prefs: { autoCheck: true, autoInstall: true } as UpdaterPrefs,
});

const STARTUP_DELAY_MS = 4000;
const UP_TO_DATE_MS = 4000;

/* Restarting mid-edit loses typing that has not reached a saved draft yet. */
const EDITOR_PATHS = [
  /^\/reports\/new\b/,
  /^\/reports\/[^/]+\/edit\b/,
  /^\/review\/[^/]+\b/,
  /^\/admin\/import\b/,
];

let adapter: Updater | null = null;
let pending: AvailableUpdate | null = null;
let initialised: Promise<void> | null = null;
/** The About dialog holds automatic installs while it is open (chrome spec §9.6). */
let autoInstallHeld = false;

function isEditing(): boolean {
  return EDITOR_PATHS.some((pattern) => pattern.test(location.pathname));
}

async function updater(): Promise<Updater> {
  adapter ??= (await createPlatform()).updater;
  return adapter;
}

async function initialise(): Promise<void> {
  const current = await updater().catch(() => null);
  if (!current?.supported) return;

  updaterState.prefs = loadUpdaterPrefs();
  updaterState.currentVersion = await current.currentVersion().catch(() => '');
  updaterState.supported = true;

  startIdleTracking();
  onIdle(() => {
    if (updaterState.prefs.autoInstall) installWhenIdle();
  });

  if (updaterState.prefs.autoCheck) {
    setTimeout(() => void checkForUpdates(true), STARTUP_DELAY_MS);
  }
}

export function startUpdater(): Promise<void> {
  initialised ??= initialise();
  return initialised;
}

/** Checks and, when one exists, downloads it before announcing anything. */
export async function checkForUpdates(background = false): Promise<void> {
  if (
    updaterState.status === 'checking' ||
    updaterState.status === 'downloading' ||
    updaterState.status === 'ready' ||
    updaterState.status === 'installing'
  ) {
    return;
  }

  const current = await updater().catch(() => null);
  if (!current?.supported) return;

  updaterState.status = 'checking';

  try {
    const update = await current.check();
    if (!update) {
      updaterState.status = background ? 'idle' : 'up-to-date';
      if (!background) {
        setTimeout(() => {
          if (updaterState.status === 'up-to-date') updaterState.status = 'idle';
        }, UP_TO_DATE_MS);
      }
      return;
    }

    pending = update;
    updaterState.version = update.version;
    updaterState.progress = 0;
    updaterState.status = 'downloading';

    await update.download((percent) => {
      updaterState.progress = percent;
    });

    updaterState.progress = 100;
    updaterState.status = 'ready';

    if (isAppIdle()) installWhenIdle();
  } catch {
    pending = null;
    updaterState.progress = 0;
    /* A startup check stays silent so an offline launch is not an error. */
    updaterState.status = background ? 'idle' : 'error';
  }
}

/** User-initiated, so it ignores the idle and editor guards. */
export async function installUpdate(): Promise<void> {
  if (!pending || updaterState.status !== 'ready') return;

  const update = pending;
  updaterState.status = 'installing';

  try {
    await update.install();
  } catch {
    updaterState.status = 'error';
  }
}

function installWhenIdle(): void {
  if (autoInstallHeld || updaterState.status !== 'ready' || isEditing()) return;
  void installUpdate();
}

/** Stops an idle install from restarting the app under an open dialog. */
export function holdAutoInstall(hold: boolean): void {
  autoInstallHeld = hold;
}

export type ManualCheckResult = 'unsupported' | 'up-to-date' | 'available' | 'error';

/**
 * The About dialog's own check: announces the result instead of popping the
 * update toast, and never installs behind the dialog.
 */
export async function checkForUpdatesNow(): Promise<ManualCheckResult> {
  const current = await updater().catch(() => null);
  if (!current?.supported) return 'unsupported';

  if (isReady()) return 'available';

  const wasHeld = autoInstallHeld;
  holdAutoInstall(true);

  try {
    await checkForUpdates(true);
  } finally {
    holdAutoInstall(wasHeld);
  }

  if (isReady()) return 'available';

  const status: UpdaterStatus = updaterState.status;
  if (status === 'error') return 'error';

  updaterState.status = 'idle';
  return 'up-to-date';
}

function isReady(): boolean {
  return updaterState.status === 'ready';
}

/** Keeps this session on the current version; the next launch checks again. */
export function useCurrentVersion(): void {
  if (updaterState.status === 'installing') return;

  pending = null;
  updaterState.version = '';
  updaterState.progress = 0;
  updaterState.status = 'idle';
}

export function dismissUpdateNotice(): void {
  if (updaterState.status === 'error' || updaterState.status === 'up-to-date') {
    updaterState.status = 'idle';
  }
}

export function setAutoCheck(value: boolean): void {
  updaterState.prefs = { ...updaterState.prefs, autoCheck: value };
  saveUpdaterPrefs(updaterState.prefs);
}

export function setAutoInstall(value: boolean): void {
  updaterState.prefs = { ...updaterState.prefs, autoInstall: value };
  saveUpdaterPrefs(updaterState.prefs);

  if (value && isAppIdle()) installWhenIdle();
}

/**
 * WebView zoom (desktop window chrome spec §8.4): 50–200 % in 10 % steps,
 * remembered across restarts, with a brief readout. The chrome itself keeps its
 * drawn size by dividing out the scale.
 */
import { chromeAdapter } from './chrome-adapter';
import { clampZoom, parseStoredZoom, zoomIn, zoomOut } from './zoom-limits';

export const ZOOM_STORAGE_KEY = 'par.window.zoom';
const INDICATOR_MS = 1200;

export const zoomState = $state({ scale: 1, indicator: false });

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function stored(): string | null {
  try {
    return localStorage.getItem(ZOOM_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persist(scale: number): void {
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, String(scale));
  } catch {
    // A blocked storage area only costs the preference, never the zoom.
  }
}

/** The titlebar and menu panel stay their drawn size at any zoom. */
function setInverse(scale: number): void {
  document.documentElement.style.setProperty('--chrome-inverse', String(1 / scale));
}

function showIndicator(): void {
  zoomState.indicator = true;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    zoomState.indicator = false;
    hideTimer = null;
  }, INDICATOR_MS);
}

/** Applies a scale to the webview and remembers it. */
export async function applyZoom(next: number, remember = true): Promise<void> {
  const scale = clampZoom(next);
  zoomState.scale = scale;
  setInverse(scale);

  try {
    await (await chromeAdapter()).setZoom(scale);
  } catch {
    // An unavailable webview zoom leaves the shell at 100 %; the state follows
    // the adapter so the menu does not claim a zoom that did not happen.
    zoomState.scale = 1;
    setInverse(1);
  }

  if (remember) persist(zoomState.scale);
}

/** Restores the saved scale when the desktop chrome mounts. */
export async function restoreZoom(): Promise<void> {
  const scale = parseStoredZoom(stored());
  await applyZoom(scale, false);
  if (scale !== 1) showIndicator();
}

export async function zoomInStep(): Promise<void> {
  await applyZoom(zoomIn(zoomState.scale));
  showIndicator();
}

export async function zoomOutStep(): Promise<void> {
  await applyZoom(zoomOut(zoomState.scale));
  showIndicator();
}

export async function resetZoom(): Promise<void> {
  await applyZoom(1);
  showIndicator();
}

/**
 * The window state the shell shares: maximized, full screen, About dialog. Owned
 * here so the titlebar, the Window menu and the View check mark read one source.
 */
import { chromeAdapter } from './chrome-adapter';
import { startEditTracking } from './edit-state.svelte';
import { CloseGuard } from './unsaved-guard.svelte';
import { restoreZoom } from './zoom.svelte';

export const chromeState = $state({
  /** False until the platform adapter has answered. */
  ready: false,
  /** True only on the desktop shell. */
  controllable: false,
  maximized: false,
  /** The pointer is over the native maximize button, which the DOM cannot see. */
  maximizeHover: false,
  fullscreen: false,
  aboutOpen: false,
});

export const closeGuard = new CloseGuard(chromeAdapter);

async function syncWindowState(): Promise<void> {
  const chrome = await chromeAdapter();

  try {
    chromeState.maximized = await chrome.isMaximized();
    chromeState.fullscreen = await chrome.isFullscreen();
  } catch {
    // A window that cannot answer is treated as restored and windowed.
  }
}

/** Copies the current window state, so a command can reflect it immediately. */
export async function refreshWindowState(): Promise<void> {
  if (!chromeState.ready) return;
  await syncWindowState();
}

export async function toggleMaximize(): Promise<void> {
  await (await chromeAdapter()).toggleMaximize();
  await refreshWindowState();
}

export async function minimize(): Promise<void> {
  await (await chromeAdapter()).minimize();
}

export async function setFullscreen(on: boolean): Promise<void> {
  const chrome = await chromeAdapter();

  try {
    await chrome.setFullscreen(on);
  } finally {
    await refreshWindowState();
  }
}

export async function toggleFullscreen(): Promise<void> {
  await setFullscreen(!chromeState.fullscreen);
}

/**
 * Wires the chrome once per document: window state, the close guard, the Edit
 * menu's focus tracking, the saved zoom. Returns the stop function.
 */
export function startChrome(): () => void {
  const stops: (() => void)[] = [];
  let disposed = false;

  void chromeAdapter()
    .then(async (chrome) => {
      if (disposed) return;

      chromeState.controllable = chrome.controllable;

      stops.push(chrome.onResized(() => void refreshWindowState()));
      stops.push(chrome.onMaximizeHover((hovering) => (chromeState.maximizeHover = hovering)));
      stops.push(closeGuard.install());
      stops.push(startEditTracking());

      await refreshWindowState();
      if (chrome.controllable) await restoreZoom();

      chromeState.ready = true;
    })
    .catch(() => {
      // The browser adapter cannot fail; a desktop failure still leaves a usable
      // page with the browser's own chrome behaviour.
      chromeState.ready = true;
    });

  return () => {
    disposed = true;
    for (const stop of stops) stop();
  };
}

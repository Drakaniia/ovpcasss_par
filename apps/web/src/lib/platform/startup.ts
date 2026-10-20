import { isTauri, platform } from './index';

/**
 * Releases the desktop splash once the shell is ready (startup spec §7.5).
 * The browser build has no splash, and a failed release is not fatal: the
 * desktop shell reveals the app at its own 10 s timeout.
 */
export async function releaseSplash(): Promise<void> {
  if (!isTauri()) return;

  try {
    await (await platform()).startup.ready();
  } catch {
    // The Rust safety timeout owns the handoff from here.
  }
}

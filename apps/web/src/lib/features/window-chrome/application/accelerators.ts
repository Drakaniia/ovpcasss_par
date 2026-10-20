/**
 * One keyboard path for the commands the menu also displays (desktop window
 * chrome spec §8.3). Ctrl+S, Ctrl+P and Ctrl+R are single-sourced here, so no
 * route keeps its own listener and nothing runs twice.
 */
import { commandFor } from './command-registry.svelte';
import { commandForAccelerator } from './menu-model';

export type KeyEventLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
};

/** Layouts disagree about `+`; the accelerator table only knows one spelling. */
function normalizeKey(key: string): string | null {
  if (key === '=' || key === '+' || key === 'Add') return '+';
  if (key === '-' || key === '_' || key === 'Subtract') return '-';
  if (key.length === 1 && key !== ' ') return key;
  if (/^F\d{1,2}$/.test(key)) return key;
  return null;
}

/**
 * The accelerator a key event represents, or null. `Ctrl` without `Alt` only,
 * so AltGr never looks like a command; `Shift` only matters for letters.
 */
export function acceleratorOf(event: KeyEventLike): string | null {
  if (event.altKey) return null;

  const key = normalizeKey(event.key);
  if (!key) return null;

  if (/^F\d{1,2}$/.test(key)) return event.ctrlKey || event.metaKey ? null : key;

  if (!event.ctrlKey && !event.metaKey) return null;

  if (/^[a-z]$/i.test(key)) {
    const letter = key.toUpperCase();
    return event.shiftKey ? `Ctrl+Shift+${letter}` : `Ctrl+${letter}`;
  }

  return `Ctrl+${key}`;
}

export type AcceleratorOptions = {
  /** False in the browser, where desktop-only chords must reach the platform. */
  controllable: () => boolean;
};

/**
 * Runs before component handlers. A chord the application owns is always
 * prevented — even when its command is disabled — so Ctrl+P never opens the
 * browser's print dialog and Ctrl+R never reloads a dirty editor.
 */
/**
 * Runs the command a key press maps to. Returns whether the application owns
 * the chord; a disabled command still owns it, so the platform default is
 * suppressed (Ctrl+P must not open the browser's print dialog).
 */
export function runAccelerator(event: KeyboardEvent, options: AcceleratorOptions): boolean {
  if (event.defaultPrevented || event.isComposing) return false;

  const accelerator = acceleratorOf(event);
  if (!accelerator) return false;

  const id = commandForAccelerator(accelerator);
  if (!id) return false;

  const command = commandFor(id);
  if (!command) return false;
  // In the browser a desktop chord belongs to the platform (Ctrl +/− zoom).
  if (command.desktopOnly && !options.controllable()) return false;

  event.preventDefault();
  if (command.enabled()) void command.run();

  return true;
}

export function installAccelerators(options: AcceleratorOptions): () => void {
  const onKeydown = (event: KeyboardEvent) => {
    runAccelerator(event, options);
  };

  window.addEventListener('keydown', onKeydown, true);
  return () => window.removeEventListener('keydown', onKeydown, true);
}

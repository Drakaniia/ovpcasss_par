/**
 * Global shortcut wiring (UI spec §8.9). The help sheet and command palette
 * are phase 12; this module only dispatches their events. Single-letter
 * shortcuts are suppressed while the user is typing, and while the first-run
 * tour owns the layer.
 */
import { hasOpenTourOverlay } from '$lib/features/onboarding/application/tour-eligibility';

export type ShortcutHandlers = {
  search: () => void;
  shortcuts: () => void;
  palette: () => void;
};

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Reads the tag name rather than `instanceof HTMLElement`, so the same check
 * works in plain application code that never touches a document.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as (Element & { isContentEditable?: boolean }) | null;
  if (!element || typeof element.tagName !== 'string') return false;
  if (element.isContentEditable) return true;
  return TYPING_TAGS.has(element.tagName);
}

/** Focus the first element marked as a search field, if the page has one. */
export function focusSearchField(): boolean {
  const field = document.querySelector<HTMLElement>('[data-search-field]');
  if (!field) return false;
  field.focus();
  return true;
}

export function installGlobalShortcuts(handlers: ShortcutHandlers): () => void {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      document.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((menu) => {
        menu.open = false;
      });
      return;
    }

    // The tour is a modal layer of its own: page shortcuts stay out of it.
    if (hasOpenTourOverlay((selector) => document.querySelector(selector))) return;

    // A chord is never typing: Ctrl/Cmd+K must open the palette with the caret
    // in a form field or a table filter, which is exactly where people are when
    // they want to jump to a document.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      handlers.palette();
      return;
    }

    if (isTypingTarget(event.target)) return;

    if (event.key === '/') {
      event.preventDefault();
      handlers.search();
      return;
    }

    if (event.key === '?') {
      event.preventDefault();
      handlers.shortcuts();
    }
  };

  window.addEventListener('keydown', onKeydown);
  return () => window.removeEventListener('keydown', onKeydown);
}

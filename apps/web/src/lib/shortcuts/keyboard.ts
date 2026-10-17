/**
 * Global shortcut wiring (UI spec §8.9). The help sheet and command palette
 * are phase 12; this module only dispatches their events. Single-letter
 * shortcuts are suppressed while the user is typing.
 */
export type ShortcutHandlers = {
  search: () => void;
  shortcuts: () => void;
  palette: () => void;
};

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return TYPING_TAGS.has(target.tagName);
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

    if (isTypingTarget(event.target)) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      handlers.palette();
      return;
    }

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

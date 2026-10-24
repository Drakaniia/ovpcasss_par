/**
 * The Edit menu (desktop window chrome spec §7.2). It acts on the focused
 * target only, and while a menu is open focus sits on a menu item — so the
 * editable is remembered and refocused before the edit command runs.
 */
import { isTypingTarget } from '$lib/shortcuts/keyboard';

export type EditCommandId = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'select-all';

/** Bumped on focus and selection changes so open menus recompute availability. */
export const editRevision = $state({ value: 0 });

let lastEditable: HTMLElement | null = null;

function chromeOwnsFocus(target: HTMLElement): boolean {
  return target.closest('[data-chrome]') !== null;
}

/** Starts tracking the focused editable; returns the stop function. */
export function startEditTracking(): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (isTypingTarget(target)) lastEditable = target;
    else if (!chromeOwnsFocus(target)) lastEditable = null;

    editRevision.value += 1;
  };

  const bump = () => {
    editRevision.value += 1;
  };

  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusIn);
  document.addEventListener('selectionchange', bump);
  document.addEventListener('mouseup', bump);
  document.addEventListener('keyup', bump);

  return () => {
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusIn);
    document.removeEventListener('selectionchange', bump);
    document.removeEventListener('mouseup', bump);
    document.removeEventListener('keyup', bump);
  };
}

function editableTarget(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && isTypingTarget(active)) return active;
  return lastEditable;
}

function hasTextSelection(): boolean {
  const target = editableTarget();
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.selectionStart !== target.selectionEnd;
  }

  const selection = document.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
}

function commandEnabled(name: string): boolean {
  try {
    return typeof document.queryCommandEnabled === 'function' && document.queryCommandEnabled(name);
  } catch {
    return false;
  }
}

type Availability = { enabled: boolean; reason?: string };

export function editAvailability(id: EditCommandId): Availability {
  // Read the revision so a menu that is already open recomputes after focus moves.
  void editRevision.value;

  const editable = editableTarget() !== null;

  switch (id) {
    case 'copy':
      return hasTextSelection()
        ? { enabled: true }
        : { enabled: false, reason: 'Select text first.' };
    case 'cut':
      if (!editable) return { enabled: false, reason: 'No editable field is focused.' };
      return hasTextSelection()
        ? { enabled: true }
        : { enabled: false, reason: 'Select text first.' };
    case 'undo':
    case 'redo':
      if (!editable) return { enabled: false, reason: 'No editable field is focused.' };
      return commandEnabled(id)
        ? { enabled: true }
        : { enabled: false, reason: id === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.' };
    case 'paste':
      // A clipboard read from script is refused, so the menu cannot paste; the
      // chord reaches the field itself (report 6).
      return {
        enabled: false,
        reason: 'Use Ctrl+V to paste; the app cannot read the clipboard.',
      };
    case 'select-all':
      return { enabled: true };
  }
}

const EXEC: Record<EditCommandId, string> = {
  undo: 'undo',
  redo: 'redo',
  cut: 'cut',
  copy: 'copy',
  paste: 'paste',
  'select-all': 'selectAll',
};

/** Refocuses the remembered field, then runs the WebView2 edit command. */
export function runEditCommand(id: EditCommandId): void {
  // Paste is the platform's: the command stays disabled and the chord is not
  // intercepted, so this line exists only to keep the id exhaustive.
  if (id === 'paste') return;

  const target = editableTarget();
  target?.focus();

  try {
    document.execCommand(EXEC[id]);
  } catch {
    // A read-only field or a refused clipboard permission leaves the page as is.
  }
}

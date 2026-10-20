/**
 * The Windows menubar keyboard model (desktop window chrome spec §8.2), kept as
 * a pure reducer so arrows, wrapping, typeahead and Escape are testable without
 * a DOM.
 */
export type MenuBarState = {
  /** Trigger with DOM focus while the bar has it. */
  barIndex: number;
  /** Open panel, or null when every panel is closed. */
  openIndex: number | null;
  /** Focused row inside the open panel. */
  itemIndex: number;
  focusInBar: boolean;
};

export type MenuShape = {
  label: string;
  items: readonly { label: string; enabled: boolean }[];
};

export type MenuKey = {
  key: string;
  altKey?: boolean;
};

export type MenuKeyResult =
  | { kind: 'state'; state: MenuBarState }
  | { kind: 'activate'; itemIndex: number; state: MenuBarState };

export const CLOSED_MENU_BAR: MenuBarState = {
  barIndex: 0,
  openIndex: null,
  itemIndex: 0,
  focusInBar: false,
};

function wrap(value: number, length: number): number {
  if (length === 0) return 0;
  return ((value % length) + length) % length;
}

/**
 * Applies one key press. Returns null for keys the menubar does not own, so the
 * caller can let the page have them.
 */
export function menuKeyAction(
  state: MenuBarState,
  key: MenuKey,
  menus: readonly MenuShape[],
): MenuKeyResult | null {
  if (menus.length === 0) return null;

  const open = state.openIndex !== null ? menus[state.openIndex] : null;

  if (open && state.openIndex !== null) {
    const count = open.items.length;

    switch (key.key) {
      case 'ArrowDown':
        return { kind: 'state', state: { ...state, itemIndex: wrap(state.itemIndex + 1, count) } };
      case 'ArrowUp':
        return {
          kind: 'state',
          state: { ...state, itemIndex: wrap(state.itemIndex - 1, count) },
        };
      case 'Home':
        return { kind: 'state', state: { ...state, itemIndex: 0 } };
      case 'End':
        return { kind: 'state', state: { ...state, itemIndex: Math.max(count - 1, 0) } };
      case 'ArrowRight':
        return {
          kind: 'state',
          state: { ...state, openIndex: wrap(state.openIndex + 1, menus.length), itemIndex: 0 },
        };
      case 'ArrowLeft':
        return {
          kind: 'state',
          state: { ...state, openIndex: wrap(state.openIndex - 1, menus.length), itemIndex: 0 },
        };
      case 'Enter':
      case ' ':
        return { kind: 'activate', itemIndex: state.itemIndex, state };
      case 'Escape':
        return { kind: 'state', state: { ...state, openIndex: null, focusInBar: true } };
      case 'Tab':
        return { kind: 'state', state: { ...state, openIndex: null, focusInBar: false } };
      default: {
        if (key.altKey || key.key.length !== 1) return null;
        const match = typeahead(open, key.key, state.itemIndex);
        return match === null ? null : { kind: 'state', state: { ...state, itemIndex: match } };
      }
    }
  }

  switch (key.key) {
    case 'ArrowRight':
      return {
        kind: 'state',
        state: { ...state, barIndex: wrap(state.barIndex + 1, menus.length), focusInBar: true },
      };
    case 'ArrowLeft':
      return {
        kind: 'state',
        state: { ...state, barIndex: wrap(state.barIndex - 1, menus.length), focusInBar: true },
      };
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      return {
        kind: 'state',
        state: { ...state, openIndex: state.barIndex, itemIndex: 0, focusInBar: true },
      };
    default:
      return null;
  }
}

/** First item after the current one whose label starts with the typed letter. */
function typeahead(menu: MenuShape, letter: string, from: number): number | null {
  const needle = letter.toLowerCase();
  const count = menu.items.length;

  for (let offset = 1; offset <= count; offset += 1) {
    const index = wrap(from + offset, count);
    if (menu.items[index]?.label.toLowerCase().startsWith(needle)) return index;
  }

  return null;
}

/** `Alt` + the menu's mnemonic opens it directly. */
export function mnemonicIndex(menus: readonly MenuShape[], mnemonics: readonly string[], letter: string) {
  const index = mnemonics.findIndex((mnemonic) => mnemonic.toLowerCase() === letter.toLowerCase());
  return index >= 0 && index < menus.length ? index : null;
}

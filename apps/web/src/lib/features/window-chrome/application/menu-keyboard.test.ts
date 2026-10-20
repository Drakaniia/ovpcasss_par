import { describe, expect, it } from 'vitest';

import { menuKeyAction, mnemonicIndex, type MenuBarState, type MenuShape } from './menu-keyboard';

const MENUS: MenuShape[] = [
  {
    label: 'File',
    items: [
      { label: 'New report', enabled: true },
      { label: 'Save draft', enabled: true },
      { label: 'Print', enabled: false },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', enabled: true },
      { label: 'Redo', enabled: true },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Keyboard shortcuts', enabled: true },
      { label: 'About Paperless PAR', enabled: true },
    ],
  },
];

const OPEN: MenuBarState = { barIndex: 0, openIndex: 0, itemIndex: 0, focusInBar: true };
const CLOSED: MenuBarState = { barIndex: 0, openIndex: null, itemIndex: 0, focusInBar: false };

function next(state: MenuBarState, key: string) {
  const result = menuKeyAction(state, { key }, MENUS);
  return result?.kind === 'state' ? result.state : result;
}

describe('menuKeyAction', () => {
  it('moves down and up through the open menu, wrapping', () => {
    expect(next(OPEN, 'ArrowDown')?.itemIndex).toBe(1);
    expect(next({ ...OPEN, itemIndex: 2 }, 'ArrowDown')?.itemIndex).toBe(0);
    expect(next(OPEN, 'ArrowUp')?.itemIndex).toBe(2);
  });

  it('jumps to the first and last item', () => {
    expect(next({ ...OPEN, itemIndex: 1 }, 'Home')?.itemIndex).toBe(0);
    expect(next(OPEN, 'End')?.itemIndex).toBe(2);
  });

  it('switches menus with left and right, wrapping', () => {
    expect(next(OPEN, 'ArrowRight')).toMatchObject({ openIndex: 1, itemIndex: 0 });
    expect(next(OPEN, 'ArrowLeft')).toMatchObject({ openIndex: 2, itemIndex: 0 });
  });

  it('activates the focused item on Enter or Space', () => {
    expect(menuKeyAction({ ...OPEN, itemIndex: 1 }, { key: 'Enter' }, MENUS)).toMatchObject({
      kind: 'activate',
      itemIndex: 1,
    });
    expect(menuKeyAction(OPEN, { key: ' ' }, MENUS)).toMatchObject({ kind: 'activate' });
  });

  it('closes on Escape and returns focus to the bar', () => {
    expect(next(OPEN, 'Escape')).toMatchObject({ openIndex: null, focusInBar: true });
  });

  it('closes on Tab and lets focus leave the bar', () => {
    expect(next(OPEN, 'Tab')).toMatchObject({ openIndex: null, focusInBar: false });
  });

  it('jumps to the next item whose label starts with the typed letter', () => {
    expect(next(OPEN, 'p')?.itemIndex).toBe(2);
    expect(next({ ...OPEN, itemIndex: 2 }, 'n')?.itemIndex).toBe(0);
    expect(menuKeyAction(OPEN, { key: 'z' }, MENUS)).toBeNull();
  });

  it('opens the focused trigger from the closed bar', () => {
    expect(menuKeyAction({ ...CLOSED, focusInBar: true }, { key: 'ArrowDown' }, MENUS)).toMatchObject({
      kind: 'state',
      state: { openIndex: 0 },
    });
    expect(
      next({ ...CLOSED, barIndex: 1, focusInBar: true }, 'ArrowRight'),
    ).toMatchObject({ barIndex: 2, focusInBar: true });
  });

  it('ignores keys it does not own', () => {
    expect(menuKeyAction(CLOSED, { key: 'F5' }, MENUS)).toBeNull();
  });
});

describe('mnemonicIndex', () => {
  it('finds the menu for an Alt letter, case-insensitively', () => {
    const mnemonics = MENUS.map((menu) => menu.label[0]);
    expect(mnemonicIndex(MENUS, mnemonics, 'f')).toBe(0);
    expect(mnemonicIndex(MENUS, mnemonics, 'H')).toBe(2);
    expect(mnemonicIndex(MENUS, mnemonics, 'z')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  ariaKeyshortcutsFor,
  buildMenus,
  commandForAccelerator,
  type MenuInputs,
  type ResolvedMenu,
} from './menu-model';

function inputs(overrides: Partial<MenuInputs> = {}): MenuInputs {
  return {
    controllable: true,
    devtools: false,
    role: 'SUBMITTER',
    signedIn: true,
    dirtyEditor: false,
    fullscreen: false,
    maximized: false,
    zoom: 1,
    availability: () => null,
    label: () => undefined,
    ...overrides,
  };
}

function item(menus: ResolvedMenu[], menuId: string, itemId: string) {
  return menus.find((menu) => menu.id === menuId)?.items.find((entry) => entry.id === itemId);
}

describe('buildMenus', () => {
  it('lists the five Windows menus in order on the desktop', () => {
    expect(buildMenus(inputs()).map((menu) => menu.id)).toEqual([
      'file',
      'edit',
      'view',
      'window',
      'help',
    ]);
  });

  it('omits the Window menu, Exit and the window-only items in the browser', () => {
    const menus = buildMenus(inputs({ controllable: false }));

    expect(menus.map((menu) => menu.id)).not.toContain('window');
    expect(item(menus, 'file', 'file.exit')).toBeUndefined();
    expect(item(menus, 'view', 'view.zoom-in')).toBeUndefined();
    expect(item(menus, 'view', 'view.fullscreen')).toBeDefined();
  });

  it('gates New report on Submitter access, with Admin standing in', () => {
    const reviewer = buildMenus(inputs({ role: 'REVIEWER' }));
    expect(item(reviewer, 'file', 'file.new-report')).toMatchObject({
      enabled: false,
      reason: 'Requires Submitter access.',
    });

    const admin = buildMenus(inputs({ role: 'ADMIN' }));
    expect(item(admin, 'file', 'file.new-report')).toMatchObject({ enabled: true });
  });

  it('gates Export on repository access', () => {
    expect(item(buildMenus(inputs()), 'file', 'file.export')).toMatchObject({
      enabled: false,
      reason: 'Requires repository access.',
    });
    expect(item(buildMenus(inputs({ role: 'APPROVER' })), 'file', 'file.export')).toMatchObject({
      enabled: true,
    });
  });

  it('disables Sign out when signed out or when a draft is dirty', () => {
    expect(item(buildMenus(inputs({ signedIn: false })), 'file', 'file.sign-out')).toMatchObject({
      enabled: false,
      reason: 'You are not signed in.',
    });

    expect(item(buildMenus(inputs({ dirtyEditor: true })), 'file', 'file.sign-out')).toMatchObject({
      enabled: false,
      reason: 'Save or discard your draft first.',
    });
  });

  it('disables Reload while a draft is dirty', () => {
    expect(item(buildMenus(inputs({ dirtyEditor: true })), 'view', 'view.reload')).toMatchObject({
      enabled: false,
      reason: 'Save or discard your draft first.',
    });
  });

  it('reads Save draft and Print from the registry, naming the missing reason', () => {
    const empty = buildMenus(inputs());

    expect(item(empty, 'file', 'file.save-draft')).toMatchObject({ enabled: true });
    expect(item(empty, 'file', 'file.print')).toMatchObject({
      enabled: false,
      reason: 'Open a report to print.',
    });

    const registered = buildMenus(
      inputs({ availability: (id) => (id === 'file.print' ? { enabled: true } : null) }),
    );
    expect(item(registered, 'file', 'file.print')).toMatchObject({ enabled: true });
  });

  it('stops at the ends of the zoom range', () => {
    expect(item(buildMenus(inputs({ zoom: 2 })), 'view', 'view.zoom-in')).toMatchObject({
      enabled: false,
      reason: 'Zoom is at 200 %.',
    });
    expect(item(buildMenus(inputs({ zoom: 0.5 })), 'view', 'view.zoom-out')).toMatchObject({
      enabled: false,
      reason: 'Zoom is at 50 %.',
    });
  });

  it('tracks Maximize / Restore and the Full screen check mark', () => {
    expect(item(buildMenus(inputs()), 'window', 'window.toggle-maximize')?.label).toBe('Maximize');
    expect(
      item(buildMenus(inputs({ maximized: true })), 'window', 'window.toggle-maximize')?.label,
    ).toBe('Restore');

    expect(item(buildMenus(inputs({ fullscreen: true })), 'view', 'view.fullscreen')).toMatchObject(
      { checkable: true, checked: true },
    );
  });

  it('shows Developer tools only in development builds', () => {
    expect(item(buildMenus(inputs()), 'view', 'view.devtools')).toBeUndefined();
    expect(item(buildMenus(inputs({ devtools: true })), 'view', 'view.devtools')).toBeDefined();
  });

  it('separates Export and Sign out in the File menu', () => {
    const menus = buildMenus(inputs());
    expect(item(menus, 'file', 'file.sign-out')?.separatorBefore).toBe(true);
  });
});

describe('accelerators', () => {
  it('maps every displayed accelerator to its command', () => {
    expect(commandForAccelerator('Ctrl+N')).toBe('file.new-report');
    expect(commandForAccelerator('Ctrl+S')).toBe('file.save-draft');
    expect(commandForAccelerator('Ctrl+P')).toBe('file.print');
    expect(commandForAccelerator('Ctrl+Shift+I')).toBe('view.devtools');
    expect(commandForAccelerator('F11')).toBe('view.fullscreen');
  });

  it('spells symbol chords the way aria-keyshortcuts expects', () => {
    expect(ariaKeyshortcutsFor('Ctrl+S')).toBe('Control+S');
    expect(ariaKeyshortcutsFor('Ctrl++')).toBe('Control+Plus');
    expect(ariaKeyshortcutsFor('Ctrl+-')).toBe('Control+Minus');
    expect(ariaKeyshortcutsFor('F11')).toBe('F11');
  });
});

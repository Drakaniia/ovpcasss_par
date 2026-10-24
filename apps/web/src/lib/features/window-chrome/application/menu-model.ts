/**
 * The application menu (desktop window chrome spec §7). Labels, accelerators
 * and order are static; availability is derived from the command registry plus
 * role, route and window state, so nothing here ever claims a command works.
 */
import { actsAs, type Role } from '@par/shared';

import { MAX_ZOOM, MIN_ZOOM, zoomLabel } from './zoom-limits';

export type MenuId = 'file' | 'edit' | 'view' | 'window' | 'help';

type MenuItemDefinition = {
  /** Stable command id; the registry is the only place that knows what it does. */
  id: string;
  label: string;
  accelerator?: string;
  /** Only the Windows shell draws these. */
  desktopOnly?: boolean;
  desktopMenu?: boolean;
  /** Full screen is a checkable view, not a one-shot. */
  checkable?: boolean;
  /** A rule of the page rather than the shell: described to the user when off. */
  separatorBefore?: boolean;
};

type MenuDefinition = {
  id: MenuId;
  label: string;
  /** Alt mnemonic, underlined while the menubar has focus. */
  mnemonic: string;
  /** Window is dropped entirely in the browser (D14). */
  desktopMenu?: boolean;
  items: MenuItemDefinition[];
};

export const MENUS: readonly MenuDefinition[] = [
  {
    id: 'file',
    label: 'File',
    mnemonic: 'F',
    items: [
      { id: 'file.new-record', label: 'New record', accelerator: 'Ctrl+N' },
      { id: 'file.save-draft', label: 'Save draft', accelerator: 'Ctrl+S' },
      { id: 'file.print', label: 'Print', accelerator: 'Ctrl+P' },
      { id: 'file.export', label: 'Export', separatorBefore: true },
      { id: 'file.sign-out', label: 'Sign out', separatorBefore: true },
      { id: 'file.exit', label: 'Exit', desktopOnly: true, separatorBefore: true },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    mnemonic: 'E',
    /*
     * No accelerators: undo, cut, copy, paste and select-all belong to the
     * platform's editor (report 6). The menu still runs them on the focused
     * field when clicked, and Paste explains that Ctrl+V is the path.
     */
    items: [
      { id: 'edit.undo', label: 'Undo' },
      { id: 'edit.redo', label: 'Redo' },
      { id: 'edit.cut', label: 'Cut', separatorBefore: true },
      { id: 'edit.copy', label: 'Copy' },
      { id: 'edit.paste', label: 'Paste' },
      { id: 'edit.select-all', label: 'Select all', separatorBefore: true },
    ],
  },
  {
    id: 'view',
    label: 'View',
    mnemonic: 'V',
    items: [
      { id: 'view.reload', label: 'Reload', accelerator: 'Ctrl+R' },
      { id: 'view.zoom-in', label: 'Zoom in', accelerator: 'Ctrl++', desktopOnly: true },
      { id: 'view.zoom-out', label: 'Zoom out', accelerator: 'Ctrl+-', desktopOnly: true },
      { id: 'view.zoom-reset', label: 'Actual size', accelerator: 'Ctrl+0', desktopOnly: true },
      { id: 'view.fullscreen', label: 'Full screen', accelerator: 'F11', checkable: true },
      {
        id: 'view.devtools',
        label: 'Developer tools',
        accelerator: 'Ctrl+Shift+I',
        separatorBefore: true,
        desktopOnly: true,
      },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    mnemonic: 'W',
    desktopMenu: true,
    items: [
      { id: 'window.minimize', label: 'Minimize' },
      { id: 'window.toggle-maximize', label: 'Maximize' },
      { id: 'window.reset-size', label: 'Reset size and position', separatorBefore: true },
      { id: 'window.close', label: 'Close', separatorBefore: true },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    mnemonic: 'H',
    items: [
      { id: 'help.tour', label: 'Take the guided tour' },
      { id: 'help.reset-onboarding', label: 'Reset onboarding' },
      { id: 'help.shortcuts', label: 'Keyboard shortcuts', accelerator: '?' },
      { id: 'help.about', label: 'About Paperless PAR', separatorBefore: true },
    ],
  },
];

export const MAXIMIZE_REASON = 'The window is already maximized.';

export type MenuInputs = {
  /** False in the browser: no Window menu, no window controls, no desktop items. */
  controllable: boolean;
  /** Development desktop builds only. */
  devtools: boolean;
  role: Role | null | undefined;
  signedIn: boolean;
  /** A wizard or edit-returned page with unsaved changes. */
  dirtyEditor: boolean;
  fullscreen: boolean;
  maximized: boolean;
  zoom: number;
  availability(id: string): { enabled: boolean; reason?: string } | null;
  label(id: string): string | undefined;
};

export type ResolvedMenuItem = {
  id: string;
  label: string;
  accelerator?: string;
  enabled: boolean;
  reason?: string;
  checkable?: boolean;
  checked?: boolean;
  separatorBefore?: boolean;
};

export type ResolvedMenu = {
  id: MenuId;
  label: string;
  mnemonic: string;
  items: ResolvedMenuItem[];
};

type Availability = { enabled: boolean; reason?: string };

function ruleAvailability(id: string, inputs: MenuInputs): Availability | null {
  switch (id) {
    case 'file.new-record':
      if (!inputs.role) return { enabled: false, reason: 'Sign in to create a record.' };
      return actsAs(inputs.role, 'ADMIN')
        ? { enabled: true }
        : { enabled: false, reason: 'Only an administrator can create a record.' };
    case 'file.export':
      return actsAs(inputs.role, 'ADMIN')
        ? { enabled: true }
        : { enabled: false, reason: 'Monitoring exports are available to administrators.' };
    case 'file.sign-out':
      if (!inputs.signedIn) return { enabled: false, reason: 'You are not signed in.' };
      if (inputs.dirtyEditor) {
        return { enabled: false, reason: 'Save or discard your draft first.' };
      }
      return { enabled: true };
    case 'file.print':
      return inputs.availability(id) ?? { enabled: false, reason: 'Open a report to print.' };
    case 'view.reload':
      return inputs.dirtyEditor
        ? { enabled: false, reason: 'Save or discard your draft first.' }
        : { enabled: true };
    case 'view.zoom-in':
      return inputs.zoom >= MAX_ZOOM
        ? { enabled: false, reason: `Zoom is at ${zoomLabel(MAX_ZOOM)}.` }
        : { enabled: true };
    case 'view.zoom-out':
      return inputs.zoom <= MIN_ZOOM
        ? { enabled: false, reason: `Zoom is at ${zoomLabel(MIN_ZOOM)}.` }
        : { enabled: true };
    default:
      return null;
  }
}

function availabilityFor(id: string, inputs: MenuInputs): Availability {
  return ruleAvailability(id, inputs) ?? inputs.availability(id) ?? { enabled: true };
}

/**
 * Menus for the current shell, role and page. A desktop-only item is dropped in
 * the browser rather than disabled: there is no window to act on.
 */
export function buildMenus(inputs: MenuInputs): ResolvedMenu[] {
  return MENUS.filter((menu) => inputs.controllable || !menu.desktopMenu).map((menu) => ({
    id: menu.id,
    label: menu.label,
    mnemonic: menu.mnemonic,
    items: menu.items
      .filter((item) => inputs.controllable || !item.desktopOnly)
      .filter((item) => item.id !== 'view.devtools' || inputs.devtools)
      .map((item) => {
        const { enabled, reason } = availabilityFor(item.id, inputs);
        return {
          id: item.id,
          label: statefulLabel(item, inputs),
          accelerator: item.accelerator,
          enabled,
          ...(reason ? { reason } : {}),
          ...(item.checkable
            ? {
                checkable: true,
                checked: item.id === 'view.fullscreen' ? inputs.fullscreen : false,
              }
            : {}),
          ...(item.separatorBefore ? { separatorBefore: true } : {}),
        };
      }),
  }));
}

function statefulLabel(item: MenuItemDefinition, inputs: MenuInputs): string {
  const override = inputs.label(item.id);
  if (override) return override;
  if (item.id === 'window.toggle-maximize')
    return inputs.maximized || inputs.fullscreen ? 'Restore' : 'Maximize';
  return item.label;
}

/** Command id → accelerator, the same table the menu renders. */
const BY_ACCELERATOR = new Map<string, string>(
  MENUS.flatMap((menu) => menu.items)
    .filter((item) => item.accelerator)
    .map((item) => [item.accelerator as string, item.id]),
);

export function commandForAccelerator(accelerator: string): string | undefined {
  return BY_ACCELERATOR.get(accelerator);
}

/** Symbol chords have named keys in `aria-keyshortcuts`; letters keep their own. */
const NAMED_KEYS: Record<string, string> = {
  'Ctrl++': 'Control+Plus',
  'Ctrl+-': 'Control+Minus',
  'Ctrl+0': 'Control+0',
};

/** `aria-keyshortcuts` spelling of a displayed accelerator. */
export function ariaKeyshortcutsFor(accelerator: string): string {
  const named = NAMED_KEYS[accelerator];
  if (named) return named;
  if (!accelerator.includes('+')) return accelerator;
  return accelerator.replace(/^Ctrl/, 'Control');
}

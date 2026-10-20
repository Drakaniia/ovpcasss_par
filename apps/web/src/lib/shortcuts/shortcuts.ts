/**
 * Shortcut registry (UI spec §8.9, phase 12 §2). The help sheet renders it, so a
 * documented key is always a key the shell actually binds. `Mod` is resolved to
 * the platform's modifier when the registry is read; it is never rendered raw.
 */
export type ShortcutRow = {
  label: string;
  /** One entry per way to invoke the action; each combo holds the chips of one chord. */
  combos: readonly (readonly string[])[];
};

export type ShortcutGroup = {
  title: string;
  rows: readonly ShortcutRow[];
};

const MOD = 'Mod';

const GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Global',
    rows: [
      { label: 'Focus search (Repository or table filter)', combos: [['/']] },
      { label: 'Command palette', combos: [[MOD, 'K']] },
      { label: 'Shortcut help', combos: [['?']] },
      { label: 'Close drawer or dialog', combos: [['Esc']] },
    ],
  },
  {
    title: 'Tables',
    rows: [
      { label: 'Move row focus', combos: [['J'], ['K'], ['↓'], ['↑']] },
      { label: 'Open focused row', combos: [['Enter']] },
    ],
  },
  {
    title: 'Report actions',
    rows: [
      { label: 'Return (opens the decision drawer)', combos: [['R']] },
      { label: 'Endorse', combos: [['E']] },
      { label: 'Approve', combos: [['A']] },
    ],
  },
  {
    title: 'Forms',
    rows: [
      {
        label: 'Next / Back step',
        combos: [
          ['Alt', '→'],
          ['Alt', '←'],
        ],
      },
      { label: 'Save draft', combos: [[MOD, 'S']] },
    ],
  },
];

/**
 * `Cmd` on macOS, `Ctrl` everywhere else, and both only when the platform cannot
 * be detected (phase 12 §3).
 */
export function modifierLabelFor(source: string | undefined): string {
  if (!source) return 'Ctrl/Cmd';
  return /mac|iphone|ipad|ipod/i.test(source) ? 'Cmd' : 'Ctrl';
}

export function platformModifierLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl/Cmd';
  return modifierLabelFor(navigator.platform || navigator.userAgent);
}

/** The registry with the platform modifier resolved into real chips. */
export function shortcutGroups(modifier = platformModifierLabel()): ShortcutGroup[] {
  return GROUPS.map((group) => ({
    title: group.title,
    rows: group.rows.map((row) => ({
      label: row.label,
      combos: row.combos.map((combo) => combo.map((key) => (key === MOD ? modifier : key))),
    })),
  }));
}

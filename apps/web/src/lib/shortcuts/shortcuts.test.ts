import { describe, expect, it } from 'vitest';

import { modifierLabelFor, shortcutGroups } from './shortcuts';

describe('modifierLabelFor', () => {
  it('uses Cmd on macOS', () => {
    expect(modifierLabelFor('MacIntel')).toBe('Cmd');
  });

  it('uses Ctrl elsewhere', () => {
    expect(modifierLabelFor('Win32')).toBe('Ctrl');
  });

  it('shows both only when the platform cannot be detected', () => {
    expect(modifierLabelFor(undefined)).toBe('Ctrl/Cmd');
    expect(modifierLabelFor('')).toBe('Ctrl/Cmd');
  });
});

describe('shortcutGroups', () => {
  it('keeps the four groups in the documented order', () => {
    expect(shortcutGroups('Ctrl').map((group) => group.title)).toEqual([
      'Global',
      'Tables',
      'Report actions',
      'Forms',
    ]);
  });

  it('resolves the platform modifier and never leaks the token', () => {
    const groups = shortcutGroups('Cmd');
    const flat = JSON.stringify(groups);

    expect(flat).not.toContain('Mod');
    expect(groups[0].rows[1].combos).toEqual([['Cmd', 'K']]);
    expect(groups[3].rows[1].combos).toEqual([['Cmd', 'S']]);
  });

  it('documents every registry shortcut', () => {
    const groups = shortcutGroups('Ctrl');

    expect(groups.flatMap((group) => group.rows)).toHaveLength(11);
    for (const row of groups.flatMap((group) => group.rows)) {
      expect(row.label.length).toBeGreaterThan(0);
      expect(row.combos.length).toBeGreaterThan(0);
      for (const combo of row.combos) expect(combo.length).toBeGreaterThan(0);
    }
  });
});

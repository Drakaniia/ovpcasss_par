import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ShortcutHelpDialog from './ShortcutHelpDialog.svelte';

function renderHelp() {
  return render(ShortcutHelpDialog, { props: {} }).body;
}

describe('ShortcutHelpDialog', () => {
  it('renders the four groups in order', () => {
    const html = renderHelp();
    const groups = ['Global', 'Tables', 'Report actions', 'Forms'];

    expect(html).toContain('Keyboard shortcuts');
    for (const group of groups) expect(html).toContain(group);

    const order = groups.map((group) => html.indexOf(`>${group}<`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('lists every shortcut as kbd chips', () => {
    const html = renderHelp();

    for (const label of [
      'Focus search (Repository or table filter)',
      'Command palette',
      'Shortcut help',
      'Close drawer or dialog',
      'Move row focus',
      'Open focused row',
      'Return (opens the decision drawer)',
      'Endorse',
      'Approve',
      'Next / Back step',
      'Save draft',
    ]) {
      expect(html).toContain(label);
    }

    expect((html.match(/<kbd/g) ?? []).length).toBeGreaterThanOrEqual(15);
    expect(html).not.toContain('Mod');
  });

  it('carries the typing note and an accessible name', () => {
    const html = renderHelp();

    expect(html).toContain('Shortcuts are disabled while typing.');
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('aria-label="Close"');
  });
});

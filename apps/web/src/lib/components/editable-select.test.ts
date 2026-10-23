import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import EditableSelectRowActions from './EditableSelectRowActions.svelte';
import {
  initialRowIndex,
  rowActionFor,
  rowsFor,
  stepRowIndex,
  triggerLabel,
  type EditableSelectOption,
  type EditableSelectRow,
} from './editable-select';

const options: EditableSelectOption[] = [
  { value: 'Registrar', label: 'Registrar' },
  { value: 'Alumni Affairs', label: 'Alumni Affairs' },
  { value: 'Research', label: 'Research (inactive)' },
];

const context = { value: '', canCreate: false, allowCustom: false };

describe('rowsFor', () => {
  it('lists every option and marks the current value', () => {
    const rows = rowsFor(options, '', { ...context, value: 'Alumni Affairs' });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.kind)).toEqual(['option', 'option', 'option']);
    expect(rows[1]).toMatchObject({ kind: 'option', selected: true });
  });

  it('filters on the label and the value, case-insensitively', () => {
    expect(rowsFor(options, 'alum', context).map((row) => row.label)).toEqual(['Alumni Affairs']);
    expect(rowsFor(options, 'RESEARCH', context)).toHaveLength(1);
  });

  it('offers a custom value to anyone when the typed name is new', () => {
    const rows = rowsFor(options, '  Cultural Affairs ', { ...context, allowCustom: true });

    expect(rows.at(-1)).toEqual({
      kind: 'custom',
      name: 'Cultural Affairs',
      label: 'Use “Cultural Affairs”',
    });
  });

  it('offers an addition to an admin, and never both actions', () => {
    const rows = rowsFor(options, 'Cultural Affairs', {
      ...context,
      canCreate: true,
      allowCustom: true,
    });

    expect(rows.filter((row) => row.kind !== 'option')).toHaveLength(1);
    expect(rows.at(-1)).toMatchObject({ kind: 'create', name: 'Cultural Affairs' });
  });

  it('treats a name already in the list as a match, not a new entry', () => {
    const rows = rowsFor(options, 'registrar', { ...context, canCreate: true });

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('option');
  });

  it('offers nothing extra when the control is a fixed list', () => {
    expect(rowsFor(options, 'Cultural Affairs', context)).toHaveLength(0);
  });
});

describe('keyboard walk', () => {
  it('opens on the selected row', () => {
    const rows = rowsFor(options, '', { ...context, value: 'Research' });

    expect(initialRowIndex(rows)).toBe(2);
  });

  it('starts at the first row when nothing is selected', () => {
    expect(initialRowIndex(rowsFor(options, '', context))).toBe(0);
  });

  it('wraps in both directions and handles an empty list', () => {
    expect(stepRowIndex(2, 3, 1)).toBe(0);
    expect(stepRowIndex(0, 3, -1)).toBe(2);
    expect(stepRowIndex(-1, 3, 1)).toBe(0);
    expect(stepRowIndex(0, 0, 1)).toBe(-1);
  });
});

describe('triggerLabel', () => {
  it('shows the option label, the typed custom value, or the placeholder', () => {
    expect(triggerLabel(options, 'Registrar', 'Select…')).toBe('Registrar');
    expect(triggerLabel(options, 'New Office', 'Select…')).toBe('New Office');
    expect(triggerLabel(options, '', 'Select…')).toBe('Select…');
  });
});

describe('rowActionFor', () => {
  const option: EditableSelectRow = {
    kind: 'option',
    value: 'Registrar',
    label: 'Registrar',
    selected: false,
  };

  it('renames the highlighted entry on F2', () => {
    expect(rowActionFor(option, { key: 'F2' })).toBe('rename');
  });

  it('removes the highlighted entry on Shift+Delete', () => {
    expect(rowActionFor(option, { key: 'Delete', shiftKey: true })).toBe('remove');
  });

  it('leaves Delete and Backspace to the search box', () => {
    expect(rowActionFor(option, { key: 'Delete' })).toBeNull();
    expect(rowActionFor(option, { key: 'Backspace' })).toBeNull();
    expect(rowActionFor(option, { key: 'F2', shiftKey: true })).toBe('rename');
  });

  it('never acts on the add or free-text row', () => {
    const add: EditableSelectRow = {
      kind: 'create',
      name: 'Cultural Affairs',
      label: 'Add “Cultural Affairs”',
    };
    const custom: EditableSelectRow = {
      kind: 'custom',
      name: 'Cultural Affairs',
      label: 'Use “Cultural Affairs”',
    };

    expect(rowActionFor(add, { key: 'F2' })).toBeNull();
    expect(rowActionFor(custom, { key: 'Delete', shiftKey: true })).toBeNull();
  });

  it('does nothing when no row is highlighted', () => {
    expect(rowActionFor(null, { key: 'F2' })).toBeNull();
    expect(rowActionFor(null, { key: 'Delete', shiftKey: true })).toBeNull();
  });
});

describe('EditableSelectRowActions', () => {
  const noop = () => {};

  it('names the entry each control acts on and stays out of the tab order', () => {
    const html = render(EditableSelectRowActions, {
      props: { name: 'Registrar', onrename: noop, onremove: noop },
    }).body;

    expect(html).toContain('aria-label="Rename Registrar"');
    expect(html).toContain('aria-label="Remove Registrar"');
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(html).toContain('data-row-control="true"');
  });

  it('disables both controls while an edit is saving', () => {
    const html = render(EditableSelectRowActions, {
      props: { name: 'Registrar', disabled: true, onrename: noop, onremove: noop },
    }).body;

    expect(html.match(/disabled/g)).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';

import {
  initialRowIndex,
  rowsFor,
  stepRowIndex,
  triggerLabel,
  type EditableSelectOption,
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

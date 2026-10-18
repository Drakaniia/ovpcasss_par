import type { Sdg } from '@par/shared';

import { baseRow, bool, count, text } from './reference-entity-options';
import type { ReferenceEntityConfig } from './reference-types';

export const sdgs: ReferenceEntityConfig = {
  key: 'sdgs',
  label: 'SDGs',
  singular: 'SDG',
  usage: 'SDGs appear in the activity section of every report.',
  duplicateFields: ['number'],
  fields: [
    {
      name: 'number',
      label: 'Number',
      kind: 'select',
      required: true,
      immutableOnEdit: true,
      hint: 'Numbers 1 to 17 are unique and cannot change after creation.',
    },
    { name: 'title', label: 'Title', kind: 'text', required: true },
    { name: 'isActive', label: 'Active', kind: 'toggle' },
  ],
  columns: () => [
    { key: 'number', label: 'No.', numeric: true },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status', secondary: true },
  ],
  createValues: (rows) => {
    const used = new Set(rows.map((row) => Number(row.cells.number)));
    const number = Array.from({ length: 17 }, (_, index) => index + 1).find(
      (candidate) => !used.has(candidate),
    );
    return { number: number ?? 1, title: '', isActive: true };
  },
  valuesFrom: (entry) => {
    const sdg = entry as Sdg;
    return { number: sdg.number, title: sdg.title, isActive: sdg.isActive };
  },
  rowFrom: (entry) => {
    const sdg = entry as Sdg;
    return {
      ...baseRow(sdg),
      name: `SDG ${sdg.number} — ${sdg.title}`,
      cells: {
        number: sdg.number,
        title: sdg.title,
        status: sdg.isActive ? 'Active' : 'Inactive',
      },
      isCurrent: false,
      entry,
    };
  },
  inputFrom: (values) => ({
    number: count(values, 'number'),
    title: text(values, 'title'),
    isActive: bool(values, 'isActive'),
  }),
  sortValue: (row) => Number(row.cells.number),
};

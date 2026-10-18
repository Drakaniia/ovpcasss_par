import type { Program } from '@par/shared';

import {
  ORDER_STATUS_COLUMNS,
  PROGRAM_LEVEL_OPTIONS,
  baseRow,
  bool,
  count,
  labelFor,
  nextOrder,
  text,
} from './reference-entity-options';
import type { ReferenceEntityConfig } from './reference-types';

export const programs: ReferenceEntityConfig = {
  key: 'programs',
  label: 'Programs',
  singular: 'program',
  usage: 'Programs are kept for the report form and the reference lists used by the office.',
  duplicateFields: ['code', 'name'],
  fields: [
    {
      name: 'code',
      label: 'Code',
      kind: 'text',
      required: true,
      uppercase: true,
      hint: 'Uppercase letters, numbers, and hyphens. Example: BSBA-FM.',
    },
    { name: 'name', label: 'Name', kind: 'text', required: true },
    {
      name: 'level',
      label: 'Level',
      kind: 'select',
      required: true,
      options: PROGRAM_LEVEL_OPTIONS,
    },
    { name: 'unitId', label: 'Unit', kind: 'select', required: true },
    {
      name: 'sortOrder',
      label: 'Sort order',
      kind: 'number',
      required: true,
      hint: 'Lower numbers appear first.',
    },
    { name: 'isActive', label: 'Active', kind: 'toggle' },
  ],
  columns: () => [
    { key: 'code', label: 'Code', mono: true },
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level', secondary: true },
    { key: 'unit', label: 'Unit', secondary: true },
    ...ORDER_STATUS_COLUMNS,
  ],
  createValues: (rows) => ({
    code: '',
    name: '',
    level: 'UNDERGRADUATE',
    unitId: '',
    sortOrder: nextOrder(rows),
    isActive: true,
  }),
  valuesFrom: (entry) => {
    const program = entry as Program;
    return {
      code: program.code,
      name: program.name,
      level: program.level,
      unitId: program.unitId,
      sortOrder: program.sortOrder,
      isActive: program.isActive,
    };
  },
  rowFrom: (entry) => {
    const program = entry as Program;
    return {
      ...baseRow(program),
      name: program.name,
      cells: {
        code: program.code,
        name: program.name,
        level: labelFor(PROGRAM_LEVEL_OPTIONS, program.level),
        unit: program.unitName,
        order: program.sortOrder,
        status: program.isActive ? 'Active' : 'Inactive',
      },
      isCurrent: false,
      entry,
    };
  },
  inputFrom: (values) => ({
    code: text(values, 'code'),
    name: text(values, 'name'),
    level: text(values, 'level') as Program['level'],
    unitId: text(values, 'unitId'),
    sortOrder: count(values, 'sortOrder'),
    isActive: bool(values, 'isActive'),
  }),
  sortValue: (row) => Number(row.cells.order),
};

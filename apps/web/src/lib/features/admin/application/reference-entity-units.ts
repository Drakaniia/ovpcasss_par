import type { Unit } from '@par/shared';

import {
  ORDER_STATUS_COLUMNS,
  UNIT_KIND_OPTIONS,
  baseRow,
  bool,
  count,
  labelFor,
  nextOrder,
  text,
} from './reference-entity-options';
import type { ReferenceEntityConfig } from './reference-types';

export const units: ReferenceEntityConfig = {
  key: 'units',
  label: 'Units & colleges',
  singular: 'unit',
  usage: 'Units and colleges appear in the report header and the monitoring exports.',
  duplicateFields: ['code', 'name'],
  fields: [
    {
      name: 'code',
      label: 'Code',
      kind: 'text',
      required: true,
      uppercase: true,
      hint: 'Uppercase letters, numbers, and hyphens. Example: CBA.',
    },
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'kind', label: 'Kind', kind: 'select', required: true, options: UNIT_KIND_OPTIONS },
    { name: 'campusId', label: 'Campus', kind: 'select', required: true },
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
    { key: 'kind', label: 'Kind', secondary: true },
    { key: 'campus', label: 'Campus', secondary: true },
    ...ORDER_STATUS_COLUMNS,
  ],
  createValues: (rows) => ({
    code: '',
    name: '',
    kind: 'COLLEGE',
    campusId: '',
    sortOrder: nextOrder(rows),
    isActive: true,
  }),
  valuesFrom: (entry) => {
    const unit = entry as Unit;
    return {
      code: unit.code,
      name: unit.name,
      kind: unit.kind,
      campusId: unit.campusId,
      sortOrder: unit.sortOrder,
      isActive: unit.isActive,
    };
  },
  rowFrom: (entry) => {
    const unit = entry as Unit;
    return {
      ...baseRow(unit),
      name: unit.name,
      cells: {
        code: unit.code,
        name: unit.name,
        kind: labelFor(UNIT_KIND_OPTIONS, unit.kind),
        campus: unit.campusName,
        order: unit.sortOrder,
        status: unit.isActive ? 'Active' : 'Inactive',
      },
      isCurrent: false,
      entry,
    };
  },
  inputFrom: (values) => ({
    code: text(values, 'code'),
    name: text(values, 'name'),
    kind: text(values, 'kind') as Unit['kind'],
    campusId: text(values, 'campusId'),
    sortOrder: count(values, 'sortOrder'),
    isActive: bool(values, 'isActive'),
  }),
  sortValue: (row) => Number(row.cells.order),
};

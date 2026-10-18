import type { Campus } from '@par/shared';

import type { ReferenceColumn, ReferenceEntityConfig } from './reference-types';
import {
  ORDER_STATUS_COLUMNS,
  baseRow,
  count,
  nextOrder,
  text,
  bool,
} from './reference-entity-options';

export const campuses: ReferenceEntityConfig = {
  key: 'campuses',
  label: 'Campuses',
  singular: 'campus',
  usage:
    'Campuses appear in the report header, the monitoring exports, and the repository filters.',
  duplicateFields: ['code', 'name'],
  fields: [
    {
      name: 'code',
      label: 'Code',
      kind: 'text',
      required: true,
      uppercase: true,
      hint: 'Uppercase letters, numbers, and hyphens. Example: MAIN.',
    },
    { name: 'name', label: 'Name', kind: 'text', required: true },
    {
      name: 'sortOrder',
      label: 'Sort order',
      kind: 'number',
      required: true,
      hint: 'Lower numbers appear first.',
    },
    { name: 'isActive', label: 'Active', kind: 'toggle' },
  ],
  columns: (rows) => [
    { key: 'code', label: 'Code', mono: true },
    { key: 'name', label: 'Name' },
    ...(rows.some((row) => row.cells.unitsCount !== null)
      ? [{ key: 'unitsCount', label: 'Units', numeric: true } as ReferenceColumn]
      : []),
    ...ORDER_STATUS_COLUMNS,
  ],
  createValues: (rows) => ({ code: '', name: '', sortOrder: nextOrder(rows), isActive: true }),
  valuesFrom: (entry) => {
    const campus = entry as Campus;
    return {
      code: campus.code,
      name: campus.name,
      sortOrder: campus.sortOrder,
      isActive: campus.isActive,
    };
  },
  rowFrom: (entry) => {
    const campus = entry as Campus;
    const units = campus.unitsCount ?? null;
    return {
      ...baseRow(campus),
      name: campus.name,
      cells: {
        code: campus.code,
        name: campus.name,
        unitsCount: units,
        order: campus.sortOrder,
        status: campus.isActive ? 'Active' : 'Inactive',
      },
      isCurrent: false,
      warning:
        units === null
          ? undefined
          : `${units} ${units === 1 ? 'unit refers' : 'units refer'} to this campus.`,
      entry,
    };
  },
  inputFrom: (values) => ({
    code: text(values, 'code'),
    name: text(values, 'name'),
    sortOrder: count(values, 'sortOrder'),
    isActive: bool(values, 'isActive'),
  }),
  sortValue: (row) => Number(row.cells.order),
};

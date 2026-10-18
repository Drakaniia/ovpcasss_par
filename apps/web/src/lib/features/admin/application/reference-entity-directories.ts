import type { Department, Office } from '@par/shared';

import {
  ORDER_STATUS_COLUMNS,
  baseRow,
  bool,
  count,
  nextOrder,
  text,
} from './reference-entity-options';
import type { ReferenceColumn, ReferenceEntityConfig } from './reference-types';

function directoryEntity(kind: 'departments' | 'offices'): ReferenceEntityConfig {
  const singular = kind === 'departments' ? 'department' : 'office';
  const label = kind === 'departments' ? 'Departments' : 'Offices';

  return {
    key: kind,
    label,
    singular,
    usage: `${label} appear in the report header and the monitoring exports.`,
    duplicateFields: ['name'],
    fields: [
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
      { key: 'name', label: 'Name' },
      ...(rows.some((row) => row.cells.usageCount !== null)
        ? [{ key: 'usageCount', label: 'Usage', numeric: true } as ReferenceColumn]
        : []),
      ...ORDER_STATUS_COLUMNS,
    ],
    createValues: (rows) => ({ name: '', sortOrder: nextOrder(rows), isActive: true }),
    valuesFrom: (entry) => {
      const item = entry as Department | Office;
      return { name: item.name, sortOrder: item.sortOrder, isActive: item.isActive };
    },
    rowFrom: (entry) => {
      const item = entry as Department | Office;
      const usageCount = item.usageCount ?? null;
      return {
        ...baseRow(item),
        name: item.name,
        cells: {
          name: item.name,
          usageCount,
          order: item.sortOrder,
          status: item.isActive ? 'Active' : 'Inactive',
        },
        isCurrent: false,
        warning:
          usageCount === null
            ? undefined
            : `${usageCount} ${usageCount === 1 ? 'report uses' : 'reports use'} this ${singular}.`,
        entry,
      };
    },
    inputFrom: (values) => ({
      name: text(values, 'name'),
      sortOrder: count(values, 'sortOrder'),
      isActive: bool(values, 'isActive'),
    }),
    sortValue: (row) => Number(row.cells.order),
  };
}

export const departments = directoryEntity('departments');
export const offices = directoryEntity('offices');

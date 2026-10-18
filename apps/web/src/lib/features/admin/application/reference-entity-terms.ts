import type { Term } from '@par/shared';

import { formatDate } from '$lib/format/datetime';

import { SEMESTER_OPTIONS, baseRow, bool, labelFor, text } from './reference-entity-options';
import type { ReferenceEntityConfig } from './reference-types';

export const terms: ReferenceEntityConfig = {
  key: 'terms',
  label: 'Terms',
  singular: 'term',
  usage: 'Terms set the semester and school year used by reports and the monitoring exports.',
  duplicateFields: [],
  fields: [
    {
      name: 'schoolYear',
      label: 'School year',
      kind: 'text',
      required: true,
      hint: 'Use the format 2025-2026.',
    },
    {
      name: 'semester',
      label: 'Semester',
      kind: 'select',
      required: true,
      options: SEMESTER_OPTIONS,
    },
    { name: 'startsOn', label: 'Start date', kind: 'date', required: true },
    { name: 'endsOn', label: 'End date', kind: 'date', required: true },
    { name: 'isActive', label: 'Active', kind: 'toggle' },
  ],
  columns: () => [
    { key: 'schoolYear', label: 'School year', mono: true },
    { key: 'semester', label: 'Semester' },
    { key: 'startsOn', label: 'Start', mono: true },
    { key: 'endsOn', label: 'End', mono: true },
    { key: 'status', label: 'Status', secondary: true },
  ],
  createValues: () => ({ schoolYear: '', semester: 1, startsOn: '', endsOn: '', isActive: true }),
  valuesFrom: (entry) => {
    const term = entry as Term;
    return {
      schoolYear: term.schoolYear,
      semester: term.semester,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      isActive: term.isActive,
    };
  },
  rowFrom: (entry) => {
    const term = entry as Term;
    const semester = labelFor(SEMESTER_OPTIONS, term.semester);
    const openReports = term.openReportCount ?? 0;
    return {
      ...baseRow(term),
      name: `${term.schoolYear} · ${semester}`,
      cells: {
        schoolYear: term.schoolYear,
        semester,
        startsOn: term.startsOn ? formatDate(term.startsOn) : null,
        endsOn: term.endsOn ? formatDate(term.endsOn) : null,
        status: term.isActive ? 'Active' : 'Inactive',
      },
      isCurrent: term.isCurrent,
      blockedReason: term.isCurrent
        ? 'Set another term current first.'
        : openReports > 0
          ? 'This term is used by open reports.'
          : undefined,
      entry,
    };
  },
  inputFrom: (values) => ({
    schoolYear: text(values, 'schoolYear'),
    semester: (typeof values.semester === 'string'
      ? values.semester
      : Number(values.semester)) as Term['semester'],
    startsOn: text(values, 'startsOn'),
    endsOn: text(values, 'endsOn'),
    isActive: bool(values, 'isActive'),
  }),
  sortValue: (row) => String(row.cells.schoolYear),
  sortDescending: true,
};

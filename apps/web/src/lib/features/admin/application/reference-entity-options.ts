import {
  REPORT_TYPES,
  type AttachmentRequirement,
  type Campus,
  type Department,
  type Office,
  type Program,
  type Sdg,
  type Term,
  type Unit,
} from '@par/shared';

import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

import type {
  ReferenceColumn,
  ReferenceDraftValues,
  ReferenceFieldOption,
  ReferenceRow,
} from './reference-types';

export const UNIT_KIND_OPTIONS: readonly ReferenceFieldOption[] = [
  { value: 'COLLEGE', label: 'College' },
  { value: 'GRADUATE_SCHOOL_GROUP', label: 'Graduate school group' },
  { value: 'SATELLITE_CAMPUS', label: 'Satellite campus' },
  { value: 'OTHER_UNIT', label: 'Other unit' },
];

export const PROGRAM_LEVEL_OPTIONS: readonly ReferenceFieldOption[] = [
  { value: 'UNDERGRADUATE', label: 'Undergraduate' },
  { value: 'GRADUATE', label: 'Graduate' },
  { value: 'DOCTORATE', label: 'Doctorate' },
  { value: 'LAW', label: 'Law' },
];

export const SEMESTER_OPTIONS: readonly ReferenceFieldOption[] = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 'SUMMER', label: 'Summer' },
];

export const ACTIVITY_TYPE_OPTIONS: readonly ReferenceFieldOption[] = REPORT_TYPES.map((value) => ({
  value,
  label: REPORT_TYPE_LABELS[value],
}));

export const ORDER_STATUS_COLUMNS: ReferenceColumn[] = [
  { key: 'order', label: 'Order', numeric: true, secondary: true },
  { key: 'status', label: 'Status', secondary: true },
];

export type ReferenceEntryUnion =
  Campus | Unit | Program | Department | Office | Sdg | Term | AttachmentRequirement;

export const labelFor = (options: readonly ReferenceFieldOption[], value: unknown): string =>
  String(options.find((option) => option.value === value)?.label ?? value ?? '');

export const text = (values: ReferenceDraftValues, key: string): string =>
  String(values[key] ?? '');

export const bool = (values: ReferenceDraftValues, key: string): boolean => Boolean(values[key]);

export const count = (values: ReferenceDraftValues, key: string): number => Number(values[key]);

export const nextOrder = (rows: readonly ReferenceRow[]): number =>
  rows.reduce((highest, row) => Math.max(highest, Number(row.cells.order ?? 0)), 0) + 1;

export const baseRow = (entry: ReferenceEntryUnion) => ({
  id: entry.id,
  isActive: entry.isActive,
  isSeeded: entry.isSeeded,
});

export const reportTypeOrder = (type: AttachmentRequirement['activityType']): number =>
  REPORT_TYPES.indexOf(type);

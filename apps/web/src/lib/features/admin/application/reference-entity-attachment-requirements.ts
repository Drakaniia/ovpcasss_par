import type { AttachmentRequirement } from '@par/shared';

import {
  ACTIVITY_TYPE_OPTIONS,
  baseRow,
  bool,
  count,
  labelFor,
  reportTypeOrder,
  text,
} from './reference-entity-options';
import type { ReferenceEntityConfig } from './reference-types';

export const attachmentRequirements: ReferenceEntityConfig = {
  key: 'attachment-requirements',
  label: 'Attachment requirements',
  singular: 'attachment requirement',
  usage: 'Attachment requirements drive the completeness checklist for new reports.',
  duplicateFields: [],
  note: () => 'Changes apply to new submissions only. Existing reports keep their requirements.',
  fields: [
    {
      name: 'activityType',
      label: 'Activity type',
      kind: 'select',
      required: true,
      options: ACTIVITY_TYPE_OPTIONS,
    },
    { name: 'label', label: 'Label', kind: 'text', required: true },
    {
      name: 'minCount',
      label: 'Minimum count',
      kind: 'number',
      required: true,
      hint: 'Use a number from 0 to 9.',
    },
    { name: 'isRequired', label: 'Required', kind: 'toggle' },
    { name: 'isActive', label: 'Active', kind: 'toggle' },
  ],
  columns: () => [
    { key: 'activityType', label: 'Activity type' },
    { key: 'label', label: 'Label' },
    { key: 'minCount', label: 'Min count', numeric: true },
    { key: 'required', label: 'Required' },
    { key: 'status', label: 'Status', secondary: true },
  ],
  createValues: () => ({
    activityType: 'OFF_CAMPUS',
    label: '',
    minCount: 1,
    isRequired: true,
    isActive: true,
  }),
  valuesFrom: (entry) => {
    const requirement = entry as AttachmentRequirement;
    return {
      activityType: requirement.activityType,
      label: requirement.label,
      minCount: requirement.minCount,
      isRequired: requirement.isRequired,
      isActive: requirement.isActive,
    };
  },
  rowFrom: (entry) => {
    const requirement = entry as AttachmentRequirement;
    return {
      ...baseRow(requirement),
      name: `${labelFor(ACTIVITY_TYPE_OPTIONS, requirement.activityType)}: ${requirement.label}`,
      cells: {
        activityType: labelFor(ACTIVITY_TYPE_OPTIONS, requirement.activityType),
        label: requirement.label,
        minCount: requirement.minCount,
        required: requirement.isRequired ? 'Required' : 'Not required',
        status: requirement.isActive ? 'Active' : 'Inactive',
      },
      isCurrent: false,
      entry,
    };
  },
  inputFrom: (values) => ({
    activityType: text(values, 'activityType') as AttachmentRequirement['activityType'],
    label: text(values, 'label'),
    minCount: count(values, 'minCount'),
    isRequired: bool(values, 'isRequired'),
    isActive: bool(values, 'isActive'),
  }),
  sortValue: (row) => {
    const typeOrder = reportTypeOrder((row.entry as AttachmentRequirement).activityType);
    return `${typeOrder}-${String(row.cells.label).toLowerCase()}`;
  },
};

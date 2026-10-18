import type { Campus, Sdg, Unit } from '@par/shared';

import { formatDate, formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

import {
  classificationLabel,
  levelLabel,
  type WizardForm,
  type WizardStep,
} from './wizard-form';

/**
 * Review summary on step 4 (UI phase 06 §3). Values use the same labels as the
 * form; each section links back to its step so a correction is one click away.
 */

export type ReviewRow = { label: string; value: string };
export type ReviewSection = { step: WizardStep; title: string; rows: ReviewRow[] };

export type WizardReferences = {
  campuses: readonly Campus[];
  units: readonly Unit[];
  sdgs: readonly Sdg[];
};

const EMPTY = '—';

function nameFor(entries: readonly { id: string; name: string }[], id: string): string {
  return entries.find((entry) => entry.id === id)?.name ?? EMPTY;
}

export function sdgLabel(sdg: Sdg): string {
  return `${sdg.number} ${sdg.title}`;
}

function activityDate(form: WizardForm): string {
  if (form.startDate && form.endDate) return formatDateRange(form.startDate, form.endDate);
  if (form.startDate) return formatDate(form.startDate);
  return EMPTY;
}

function picRows(form: WizardForm): ReviewRow[] {
  if (form.pics.length === 0) return [{ label: 'People in charge', value: EMPTY }];

  return form.pics.map((pic, index) => {
    const contact = [pic.email.trim(), pic.phone.trim()].filter(Boolean).join(' · ');
    const name = pic.name.trim() || '(no name)';
    return {
      label: `Person in charge ${index + 1}`,
      value: contact ? `${name} — ${contact}` : name,
    };
  });
}

function excerpt(text: string, length = 160): string {
  const trimmed = text.trim();
  if (!trimmed) return EMPTY;
  return trimmed.length > length ? `${trimmed.slice(0, length).trimEnd()}…` : trimmed;
}

export function reviewSections(
  form: WizardForm,
  references: WizardReferences,
  attachmentSummary = EMPTY,
): ReviewSection[] {
  const sdgs = form.sdgIds
    .map((id) => references.sdgs.find((sdg) => sdg.id === id))
    .filter((sdg): sdg is Sdg => Boolean(sdg))
    .map(sdgLabel);

  return [
    {
      step: 1,
      title: 'Activity classification',
      rows: [
        { label: 'Activity type', value: form.type ? REPORT_TYPE_LABELS[form.type] : EMPTY },
        { label: 'Classification', value: classificationLabel(form.classification) },
        { label: 'Campus', value: form.campusId ? nameFor(references.campuses, form.campusId) : EMPTY },
        { label: 'College or unit', value: form.unitId ? nameFor(references.units, form.unitId) : EMPTY },
        { label: 'Department', value: form.department.trim() || EMPTY },
        { label: 'Office', value: form.office.trim() || EMPTY },
        { label: 'Level', value: levelLabel(form.level) },
      ],
    },
    {
      step: 2,
      title: 'Activity details',
      rows: [
        { label: 'Title of the activity', value: form.title.trim() || EMPTY },
        { label: 'Date of the activity', value: activityDate(form) },
        { label: 'Location', value: form.location.trim() || EMPTY },
      ],
    },
    {
      step: 3,
      title: 'People and outcomes',
      rows: [
        { label: 'Total number of students', value: form.totalStudents || EMPTY },
        { label: 'Total number of PIC', value: form.totalPic || EMPTY },
        ...picRows(form),
        { label: 'SDGs', value: sdgs.length > 0 ? sdgs.join('; ') : EMPTY },
      ],
    },
    {
      step: 4,
      title: 'Narrative and attachments',
      rows: [
        { label: 'Narrative', value: excerpt(form.narrative) },
        { label: 'Attachments', value: attachmentSummary },
      ],
    },
  ];
}

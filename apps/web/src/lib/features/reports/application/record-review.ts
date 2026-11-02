import type { Campus, Sdg, Unit } from '@par/shared';
import { joinLocationList } from '@par/shared';

import { formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

import {
  classificationLabel,
  levelLabel,
  STEP_META,
  type WizardForm,
  type WizardStep,
} from './record-form';

/**
 * The review sheet that stands between a completed wizard and a sent record
 * (2026-11-01). It reads the form the way the API will read it: the same labels
 * as the wizard, one row per value, and an em dash for anything left blank, so
 * an empty optional field is visibly empty instead of silently absent.
 */

export type ReviewRow = { label: string; value: string };

export type ReviewSection = {
  step: WizardStep;
  title: string;
  rows: ReviewRow[];
};

export type ReviewReferences = {
  campuses: readonly Campus[];
  units: readonly Unit[];
  sdgs: readonly Sdg[];
};

const DASH = '—';

function text(value: string | number | undefined | null): string {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? DASH : trimmed;
}

/** A blank date pair must not reach the date formatter. */
function dates(form: WizardForm): string {
  if (!form.startDate || !form.endDate) return DASH;
  return text(formatDateRange(form.startDate, form.endDate));
}

function campusName(references: ReviewReferences, id: string): string {
  if (!id) return DASH;
  const campus = references.campuses.find((entry) => entry.id === id);
  return text(campus?.name ?? '');
}

function unitName(references: ReviewReferences, id: string): string {
  if (!id) return DASH;
  const unit = references.units.find((entry) => entry.id === id);
  return text(unit?.name ?? '');
}

function sdgText(references: ReviewReferences, ids: readonly string[]): string {
  const titles = ids
    .map((id) => references.sdgs.find((sdg) => sdg.id === id))
    .filter((sdg): sdg is Sdg => Boolean(sdg))
    .map((sdg) => `${sdg.number} ${sdg.title}`);

  return titles.length > 0 ? titles.join(', ') : DASH;
}

/** One line per person: what the reviewer needs, without a nested table. */
function picRows(form: WizardForm): ReviewRow[] {
  if (form.pics.length === 0) return [{ label: 'People in charge', value: DASH }];

  return form.pics.map((pic, index) => ({
    label: `Person in charge ${index + 1}`,
    value:
      [pic.name.trim(), pic.email.trim(), pic.phone.trim()].filter(Boolean).join(' · ') || DASH,
  }));
}

export function reviewSections(form: WizardForm, references: ReviewReferences): ReviewSection[] {
  return [
    {
      step: 1,
      title: STEP_META[1].title,
      rows: [
        { label: 'Activity type', value: text(form.type ? REPORT_TYPE_LABELS[form.type] : '') },
        { label: 'Classification', value: text(classificationLabel(form.classification)) },
        { label: 'Campus', value: campusName(references, form.campusId) },
        { label: 'College or unit', value: unitName(references, form.unitId) },
        { label: 'Department', value: text(form.department) },
        { label: 'Office', value: text(form.office) },
        { label: 'Level', value: text(levelLabel(form.level)) },
      ],
    },
    {
      step: 2,
      title: STEP_META[2].title,
      rows: [
        { label: 'Title of the activity', value: text(form.title) },
        { label: 'Activity dates', value: dates(form) },
        { label: 'Number of days', value: text(form.activityCount) },
        { label: 'Location', value: text(joinLocationList(form.locations)) },
        { label: 'SDGs', value: sdgText(references, form.sdgIds) },
      ],
    },
    {
      step: 3,
      title: STEP_META[3].title,
      rows: [
        { label: 'Total number of students', value: text(form.totalStudents) },
        { label: 'Total number of PIC', value: text(form.totalPic) },
        ...picRows(form),
      ],
    },
  ];
}

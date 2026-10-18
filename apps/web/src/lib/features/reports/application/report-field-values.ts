import type {
  AttachmentRequirement,
  Campus,
  Department,
  Office,
  ReportDraftForm,
  Sdg,
  Unit,
} from '@par/shared';

import { formatDate } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

import { classificationLabel, levelLabel } from './wizard-form';

/**
 * Labels, order, and display values for the wizard field set (phase 06 shared
 * contract). The edit-returned page reuses these for its section index, its
 * flagged-field links, and the 409 side-by-side comparison.
 */

export type ReportFieldKey =
  | 'type'
  | 'classification'
  | 'campusId'
  | 'unitId'
  | 'department'
  | 'office'
  | 'level'
  | 'title'
  | 'startDate'
  | 'endDate'
  | 'location'
  | 'totalStudents'
  | 'totalPic'
  | 'pics'
  | 'sdgIds'
  | 'narrative';

export const FIELD_LABELS: Record<ReportFieldKey, string> = {
  type: 'Activity type',
  classification: 'Classification',
  campusId: 'Campus',
  unitId: 'College or unit',
  department: 'Department',
  office: 'Office',
  level: 'Level',
  title: 'Title of the activity',
  startDate: 'Start date',
  endDate: 'End date',
  location: 'Location',
  totalStudents: 'Total number of students',
  totalPic: 'Total number of PIC',
  pics: 'People in charge',
  sdgIds: 'SDGs',
  narrative: 'Narrative',
};

/** Form order; summaries, diffs, and focus order all follow it. */
export const FIELD_ORDER: readonly ReportFieldKey[] = [
  'type',
  'classification',
  'campusId',
  'unitId',
  'department',
  'office',
  'level',
  'title',
  'startDate',
  'endDate',
  'location',
  'totalStudents',
  'totalPic',
  'pics',
  'sdgIds',
  'narrative',
];

/** The four fieldset groups, in wizard order (UI spec §7.6). */
export type FieldGroup = {
  id: string;
  numeral: string;
  title: string;
  fields: readonly ReportFieldKey[];
};

export const FIELD_GROUPS: readonly FieldGroup[] = [
  {
    id: 'activity-classification',
    numeral: 'I',
    title: 'Activity classification',
    fields: ['type', 'classification', 'campusId', 'unitId', 'department', 'office', 'level'],
  },
  {
    id: 'activity',
    numeral: 'II',
    title: 'Activity',
    fields: ['title', 'startDate', 'endDate', 'location'],
  },
  {
    id: 'people',
    numeral: 'III',
    title: 'People and outcomes',
    fields: ['totalStudents', 'totalPic', 'pics', 'sdgIds'],
  },
  {
    id: 'narrative',
    numeral: 'IV',
    title: 'Narrative and attachments',
    fields: ['narrative'],
  },
];

export type EditReferences = {
  campuses: Campus[];
  units: Unit[];
  departments: Department[];
  offices: Office[];
  sdgs: Sdg[];
  requirements: AttachmentRequirement[];
};

export function emptyReferences(): EditReferences {
  return { campuses: [], units: [], departments: [], offices: [], sdgs: [], requirements: [] };
}

/**
 * Return comments carry the API's field ids. Normalising case, separators, and
 * the two date names the contract uses keeps the mapping tolerant without
 * inventing fields: anything unknown is ignored, never guessed.
 */
const FIELD_ALIASES: Record<string, ReportFieldKey> = {
  ...Object.fromEntries(FIELD_ORDER.map((key) => [normalizeFieldId(key), key])),
  activitystartdate: 'startDate',
  activityenddate: 'endDate',
  startdate: 'startDate',
  enddate: 'endDate',
  sdgids: 'sdgIds',
  totalstudents: 'totalStudents',
  totalpic: 'totalPic',
};

function normalizeFieldId(id: string): string {
  return id.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function fieldKeyFromId(id: string): ReportFieldKey | null {
  return FIELD_ALIASES[normalizeFieldId(id)] ?? null;
}

/** Wizard form keys and report field keys are the same names today. */
export function isReportFieldKey(value: string): value is ReportFieldKey {
  return (FIELD_ORDER as readonly string[]).includes(value);
}

/** Flagged fields in form order, deduplicated; unknown ids are dropped. */
export function flaggedFieldKeys(fieldIds: readonly string[] | undefined): ReportFieldKey[] {
  if (!fieldIds || fieldIds.length === 0) return [];

  const found = new Set<ReportFieldKey>();
  for (const id of fieldIds) {
    const key = fieldKeyFromId(id);
    if (key) found.add(key);
  }

  return FIELD_ORDER.filter((key) => found.has(key));
}

function nameFor(entries: readonly { id: string; name: string }[], id: string | undefined): string {
  if (!id) return '—';
  return entries.find((entry) => entry.id === id)?.name ?? id;
}

function sdgLabel(entry: Sdg): string {
  return `${entry.number} ${entry.title}`;
}

function picLines(form: ReportDraftForm): string {
  const pics = form.pics ?? [];
  if (pics.length === 0) return '—';

  return pics
    .map((pic) => {
      const contact = [pic.email, pic.phone].filter(Boolean).join(' · ');
      return contact ? `${pic.name} · ${contact}` : pic.name;
    })
    .join('\n');
}

/** Display value for one form field; missing optional values render an em dash. */
export function displayFieldValue(
  key: ReportFieldKey,
  form: ReportDraftForm,
  references: EditReferences,
): string {
  switch (key) {
    case 'type':
      return form.type ? REPORT_TYPE_LABELS[form.type] : '—';
    case 'classification':
      return form.classification ? classificationLabel(form.classification) : '—';
    case 'level':
      return form.level ? levelLabel(form.level) : '—';
    case 'campusId':
      return nameFor(references.campuses, form.campusId);
    case 'unitId':
      return nameFor(references.units, form.unitId);
    case 'department':
      return form.department?.trim() || '—';
    case 'office':
      return form.office?.trim() || '—';
    case 'title':
      return form.title?.trim() || '—';
    case 'startDate':
      return form.activityStartDate ? formatDate(form.activityStartDate) : '—';
    case 'endDate':
      return form.activityEndDate ? formatDate(form.activityEndDate) : '—';
    case 'location':
      return form.location?.trim() || '—';
    case 'totalStudents':
      return form.totalStudents === undefined ? '—' : String(form.totalStudents);
    case 'totalPic':
      return form.totalPic === undefined ? '—' : String(form.totalPic);
    case 'pics':
      return picLines(form);
    case 'sdgIds': {
      const ids = form.sdgIds ?? [];
      if (ids.length === 0) return '—';
      return ids
        .map((id) => {
          const entry = references.sdgs.find((sdg) => sdg.id === id);
          return entry ? sdgLabel(entry) : id;
        })
        .join(', ');
    }
    case 'narrative':
      return form.narrative?.trim() ? form.narrative : '—';
  }
}

/** Whole-value comparison that ignores formatting noise but not content. */
export function fieldValuesEqual(
  key: ReportFieldKey,
  a: ReportDraftForm,
  b: ReportDraftForm,
): boolean {
  return compareFieldValue(key, a) === compareFieldValue(key, b);
}

function compareFieldValue(key: ReportFieldKey, form: ReportDraftForm): string {
  switch (key) {
    case 'title':
    case 'location':
    case 'department':
    case 'office':
      return (form[key] ?? '').trim();
    case 'narrative':
      return form.narrative ?? '';
    case 'totalStudents':
      return String(form.totalStudents ?? '');
    case 'totalPic':
      return String(form.totalPic ?? '');
    case 'pics':
      return JSON.stringify(
        (form.pics ?? []).map((pic) => [
          pic.name.trim(),
          pic.email?.trim() ?? '',
          pic.phone?.trim() ?? '',
        ]),
      );
    case 'sdgIds':
      return [...(form.sdgIds ?? [])].sort().join('|');
    case 'startDate':
      return form.activityStartDate ?? '';
    case 'endDate':
      return form.activityEndDate ?? '';
    default:
      return form[key] ?? '';
  }
}

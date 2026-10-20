import type {
  Attachment,
  Campus,
  ReportDetail,
  ReportDraftForm,
  ReportPic,
  Sdg,
  Unit,
} from '@par/shared';

import { formatDate, formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

import { classificationLabel, levelLabel } from '$lib/features/reports/application/wizard-form';

/**
 * Facsimile document model (UI spec §8.1). Everything the paper form shows is
 * derived here from the report detail, so the document component stays markup
 * and the values are unit-tested. Missing optional values always render an em
 * dash, never blank space.
 */

export type FacsimileRow = {
  label: string;
  value: string;
  /** Preserves paragraph and line breaks (narratives, PIC lists). */
  multiline?: boolean;
};

export type FacsimileSection = {
  id: string;
  numeral: string;
  title: string;
  rows: FacsimileRow[];
};

export type FacsimileReferences = {
  campuses: readonly Campus[];
  units: readonly Unit[];
  sdgs: readonly Sdg[];
};

export const EMPTY_VALUE = '—';

const NARRATIVE_ID = 'narrative';
const ATTACHMENTS_ID = 'attachments';
const REVIEW_HISTORY_ID = 'review-history';

export function narrativeSectionId(): string {
  return NARRATIVE_ID;
}

export function attachmentsSectionId(): string {
  return ATTACHMENTS_ID;
}

export function reviewHistorySectionId(): string {
  return REVIEW_HISTORY_ID;
}

function nameFor(entries: readonly { id: string; name: string }[], id: string | undefined): string {
  if (!id) return EMPTY_VALUE;
  return entries.find((entry) => entry.id === id)?.name ?? EMPTY_VALUE;
}

export function sdgLabel(sdg: Sdg): string {
  return `${sdg.number} ${sdg.title}`;
}

function sdgValues(ids: readonly string[], references: FacsimileReferences): string {
  if (ids.length === 0) return EMPTY_VALUE;

  const labels = ids.map((id) => {
    const entry = references.sdgs.find((sdg) => sdg.id === id);
    return entry ? sdgLabel(entry) : id;
  });

  return labels.join('; ');
}

function activityDate(form: ReportDraftForm): string {
  const start = form.activityStartDate;
  const end = form.activityEndDate;
  if (start && end) return formatDateRange(start, end);
  if (start) return formatDate(start);
  return EMPTY_VALUE;
}

function picNames(pics: readonly ReportPic[]): string {
  const names = pics.map((pic) => pic.name.trim()).filter(Boolean);
  return names.length > 0 ? names.join('\n') : EMPTY_VALUE;
}

function picContacts(pics: readonly ReportPic[]): string {
  const lines = pics
    .map((pic) => [pic.email?.trim(), pic.phone?.trim()].filter(Boolean).join(' · '))
    .filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : EMPTY_VALUE;
}

/** Sections I–III; narrative, attachments, and review history follow them. */
export function facsimileSections(
  detail: ReportDetail,
  references: FacsimileReferences,
): FacsimileSection[] {
  const form = detail.form;

  return [
    {
      id: 'activity-classification',
      numeral: 'I',
      title: 'Activity classification',
      rows: [
        { label: 'Activity type', value: REPORT_TYPE_LABELS[form.type] ?? EMPTY_VALUE },
        { label: 'Classification', value: classificationLabel(form.classification) },
        { label: 'Campus', value: nameFor(references.campuses, form.campusId) },
        { label: 'College or unit', value: nameFor(references.units, form.unitId) },
        { label: 'Department', value: form.department?.trim() || EMPTY_VALUE },
        { label: 'Office', value: form.office?.trim() || EMPTY_VALUE },
        { label: 'Level', value: levelLabel(form.level) },
      ],
    },
    {
      id: 'activity',
      numeral: 'II',
      title: 'Activity',
      rows: [
        { label: 'Title of the activity', value: form.title?.trim() || EMPTY_VALUE },
        { label: 'Date(s) of activity', value: activityDate(form) },
        { label: 'Location', value: form.location?.trim() || EMPTY_VALUE },
        { label: 'SDG(s)', value: sdgValues(form.sdgIds ?? [], references) },
      ],
    },
    {
      id: 'participants',
      numeral: 'III',
      title: 'Participants',
      rows: [
        {
          label: 'Total number of students',
          value: form.totalStudents === undefined ? EMPTY_VALUE : String(form.totalStudents),
        },
        {
          label: 'Total number of PIC',
          value: form.totalPic === undefined ? EMPTY_VALUE : String(form.totalPic),
        },
        {
          label: 'Name(s) of personnel in-charge',
          value: picNames(form.pics ?? []),
          multiline: true,
        },
        { label: 'PIC email/contact', value: picContacts(form.pics ?? []), multiline: true },
      ],
    },
  ];
}

export function narrativeText(detail: ReportDetail): string {
  return detail.form.narrative?.trim() ? detail.form.narrative : EMPTY_VALUE;
}

export function documentTitle(detail: ReportDetail): string {
  return detail.form.title?.trim() || EMPTY_VALUE;
}

/** Label groups for section V; unlabelled files stay visible under one heading. */
export type AttachmentGroup = { label: string; files: string[] };

export function attachmentGroups(attachments: readonly Attachment[]): AttachmentGroup[] {
  const groups = new Map<string, string[]>();

  for (const attachment of attachments) {
    if (attachment.status === 'DELETED') continue;
    const label = attachment.label.trim() || 'Unlabelled';
    const files = groups.get(label) ?? [];
    files.push(attachment.originalName);
    groups.set(label, files);
  }

  return [...groups.entries()].map(([label, files]) => ({ label, files }));
}

export function referenceCounts(detail: ReportDetail): number {
  const form = detail.form;
  const values: unknown[] = [
    form.type,
    form.classification,
    form.campusId,
    form.unitId,
    form.department,
    form.office,
    form.level,
    form.title,
    form.activityStartDate,
    form.activityEndDate,
    form.location,
    form.totalStudents,
    form.totalPic,
    form.pics,
    form.sdgIds,
    form.narrative,
  ];

  return values.filter((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
}

export const REPORT_FIELD_COUNT = 16;

import type { ReportPicRow, ReportRow } from '@par/db';
import type { ReportActivityInput } from '@par/shared';

/**
 * Human labels for an office correction (spec §9.2). The list is deliberately
 * a list of fields, not a diff: the mail and the audit trail say what changed,
 * and the narrative, attachments and signature are never among them.
 */
type ScalarField = Exclude<keyof ReportActivityInput, 'pics' | 'sdgIds'>;

const FIELD_LABELS: readonly (readonly [ScalarField, string])[] = [
  ['type', 'Activity type'],
  ['classification', 'Classification'],
  ['campusId', 'Campus'],
  ['unitId', 'College or unit'],
  ['department', 'Department'],
  ['office', 'Office'],
  ['level', 'Level'],
  ['title', 'Activity title'],
  ['activityStartDate', 'Start date'],
  ['activityEndDate', 'End date'],
  ['location', 'Location'],
  ['activityCount', 'Number of activities'],
  ['totalStudents', 'Total students'],
  ['totalPic', 'Total personnel in charge'],
];

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function samePics(before: readonly ReportPicRow[], after: ReportActivityInput['pics']): boolean {
  if (before.length !== after.length) return false;

  const left = before
    .map((pic) =>
      [pic.name.trim(), pic.email.trim().toLowerCase(), text(pic.phone).trim()].join('|'),
    )
    .sort();
  const right = after
    .map((pic) =>
      [pic.name.trim(), pic.email.trim().toLowerCase(), text(pic.phone).trim()].join('|'),
    )
    .sort();
  return left.every((value, index) => value === right[index]);
}

function sameIds(before: readonly string[], after: readonly string[]): boolean {
  if (before.length !== after.length) return false;

  const left = [...before].sort();
  const right = [...after].sort();
  return left.every((value, index) => value === right[index]);
}

/**
 * The labels of everything the request changed, in the order the form presents
 * them. An empty list means the request is a no-op and nothing is mailed.
 */
export function changedActivityFields(input: {
  row: ReportRow;
  beforePics: readonly ReportPicRow[];
  beforeSdgIds: readonly string[];
  form: ReportActivityInput;
}): string[] {
  const changed: string[] = [];

  for (const [key, label] of FIELD_LABELS) {
    if (text(input.row[key]) !== text(input.form[key])) changed.push(label);
  }

  if (!samePics(input.beforePics, input.form.pics)) changed.push('Personnel in charge');
  if (!sameIds(input.beforeSdgIds, input.form.sdgIds))
    changed.push('Sustainable Development Goals');

  return changed;
}

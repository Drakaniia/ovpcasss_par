import { emailSchema } from '@par/shared';

import { WIZARD_STEPS, type WizardForm, type WizardStep } from './record-form';

/**
 * The office's record form checks (bug phases 02 and 03). Empty required fields
 * are punished late — on Continue, a later step, or Create — while a field the
 * reporter edited is checked as soon as focus leaves it. Required-ness and
 * formats mirror the shared Zod contract.
 */

export type FieldErrors = Record<string, string>;

const PHONE_PATTERN = /^[0-9+()\-\s]+$/;

const FIXED_LABELS: Record<string, string> = {
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
  activityCount: 'Number of activities',
  totalStudents: 'Total number of students',
  totalPic: 'Total number of PIC',
  pics: 'People in charge',
  sdgIds: 'SDGs',
};

const PIC_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
};

const PIC_KEYS = ['name', 'email', 'phone'] as const;

const STEP_FIELDS: Record<WizardStep, readonly string[]> = {
  1: ['type', 'classification', 'campusId', 'unitId', 'level'],
  2: ['title', 'startDate', 'endDate', 'location', 'activityCount', 'sdgIds'],
  3: ['totalStudents', 'totalPic', 'pics'],
};

/** DOM id -> field key, shared by the inputs and the blur handler. */
const DOM_FIELDS: Record<string, string> = {
  'wiz-type': 'type',
  'wiz-classification': 'classification',
  'wiz-campus': 'campusId',
  'wiz-unit': 'unitId',
  'wiz-department': 'department',
  'wiz-office': 'office',
  'wiz-level': 'level',
  'wiz-title': 'title',
  'wiz-start-date': 'startDate',
  'wiz-end-date': 'endDate',
  'wiz-location': 'location',
  'wiz-activity-count': 'activityCount',
  'wiz-sdgs': 'sdgIds',
  'wiz-total-students': 'totalStudents',
  'wiz-total-pic': 'totalPic',
};

const FIELD_DOM = Object.fromEntries(
  Object.entries(DOM_FIELDS).map(([dom, field]) => [field, dom]),
);

export function fieldFromDomId(id: string): string | undefined {
  const pic = /^pic-(.+)-(name|email|phone)$/.exec(id);
  if (pic) return `pic.${pic[1]}.${pic[2]}`;
  return DOM_FIELDS[id];
}

export function domIdForField(field: string): string | undefined {
  const pic = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
  if (pic) return `pic-${pic[1]}-${pic[2]}`;
  return FIELD_DOM[field];
}

function dateError(text: string, iso: string): string | undefined {
  if (!text.trim()) return 'Enter the date.';
  if (!iso) return 'Enter the date as DD MMM YYYY.';
  return undefined;
}

function countError(value: string, noun: string): string | undefined {
  if (value.trim() === '') return `Enter the total number of ${noun}.`;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 'Use a whole number of 0 or greater.';
  return undefined;
}

function picCountError(value: string): string | undefined {
  if (value.trim() === '') return 'Enter the total number of PIC.';
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 'Use a whole number of 0 or greater.';
  return undefined;
}

function activityCountError(value: string): string | undefined {
  if (value.trim() === '') return 'Enter the number of activities.';
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 'Use a whole number of 1 or greater.';
  return undefined;
}

/**
 * One field, one message. Blur and step validation share this so a field never
 * reports something different depending on how it was validated.
 */
export function validateField(field: string, form: WizardForm): string | undefined {
  switch (field) {
    case 'type':
      return form.type ? undefined : 'Select the activity type.';
    case 'classification':
      return form.classification ? undefined : 'Select the classification.';
    case 'campusId':
      return form.campusId ? undefined : 'Select the campus.';
    case 'unitId':
      return form.unitId ? undefined : 'Select the college or unit.';
    case 'department':
    case 'office':
      return undefined;
    case 'level':
      return form.level ? undefined : 'Select the level.';
    case 'title':
      return form.title.trim() ? undefined : 'Enter the title of the activity.';
    case 'startDate':
      return dateError(form.startText, form.startDate);
    case 'endDate': {
      const message = dateError(form.endText, form.endDate);
      if (message) return message;
      return form.endDate < form.startDate
        ? 'The end date must be on or after the start date.'
        : undefined;
    }
    case 'location':
      return form.location.trim() ? undefined : 'Enter the location.';
    case 'activityCount':
      return activityCountError(form.activityCount);
    case 'totalStudents':
      return countError(form.totalStudents, 'students');
    case 'totalPic': {
      const message = picCountError(form.totalPic);
      if (message) return message;
      return form.pics.length === Number(form.totalPic)
        ? undefined
        : 'The PIC count does not match the number of PIC rows.';
    }
    case 'pics':
      return form.pics.length === 0 ? 'Add at least one person in charge.' : undefined;
    case 'sdgIds':
      return form.sdgIds.length === 0 ? 'Select at least one SDG.' : undefined;
    default:
      break;
  }

  const match = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
  if (!match) return undefined;

  const pic = form.pics.find((row) => row.id === match[1]);
  if (!pic) return undefined;

  if (match[2] === 'name') return pic.name.trim() ? undefined : 'Enter the name.';
  if (match[2] === 'email') {
    if (!pic.email.trim()) return 'Enter the email address.';
    return emailSchema.safeParse(pic.email.trim()).success
      ? undefined
      : 'Enter a valid email address.';
  }
  if (!pic.phone.trim()) return undefined;
  return PHONE_PATTERN.test(pic.phone.trim())
    ? undefined
    : 'Use digits, spaces, +, -, and parentheses.';
}

/** True when the field holds no content yet; an untouched blank is not wrong. */
export function isEmptyField(field: string, form: WizardForm): boolean {
  switch (field) {
    case 'type':
      return form.type === '';
    case 'classification':
      return form.classification === '';
    case 'level':
      return form.level === '';
    case 'campusId':
    case 'unitId':
    case 'department':
    case 'office':
    case 'title':
    case 'startDate':
    case 'startText':
    case 'endDate':
    case 'endText':
    case 'location':
    case 'activityCount':
    case 'totalStudents':
    case 'totalPic':
      return String(form[field as keyof WizardForm] ?? '').trim() === '';
    case 'sdgIds':
      return form.sdgIds.length === 0;
    case 'pics':
      return form.pics.length === 0;
    default:
      break;
  }

  const match = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
  if (!match) return false;

  const pic = form.pics.find((row) => row.id === match[1]);
  if (!pic) return true;
  return String(pic[match[2] as (typeof PIC_KEYS)[number]] ?? '').trim() === '';
}

/**
 * Blur checks a field only when the reporter edited it. A field emptied after
 * holding content still gets the required message; an untouched blank does not.
 */
export function validateEditedField(
  field: string,
  form: WizardForm,
  options: { wasCleared?: boolean } = {},
): string | undefined {
  if (!options.wasCleared && isEmptyField(field, form)) return undefined;
  return validateField(field, form);
}

export function validateStep(step: WizardStep, form: WizardForm): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of STEP_FIELDS[step]) {
    const message = validateField(field, form);
    if (message) errors[field] = message;
  }

  if (step === 3) {
    for (const pic of form.pics) {
      for (const key of PIC_KEYS) {
        const field = `pic.${pic.id}.${key}`;
        const message = validateField(field, form);
        if (message) errors[field] = message;
      }
    }
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** The first step with problems, used by Create to send the reporter back. */
export function firstInvalidStep(
  form: WizardForm,
): { step: WizardStep; errors: FieldErrors } | null {
  for (const step of WIZARD_STEPS) {
    const errors = validateStep(step, form);
    if (hasErrors(errors)) return { step, errors };
  }
  return null;
}

function orderedKeys(form: WizardForm): string[] {
  const picKeys = form.pics.flatMap((pic) => [
    `pic.${pic.id}.name`,
    `pic.${pic.id}.email`,
    `pic.${pic.id}.phone`,
  ]);

  return [
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
    'activityCount',
    'totalStudents',
    'totalPic',
    'pics',
    ...picKeys,
    'sdgIds',
  ];
}

export function labelFor(field: string, form: WizardForm): string {
  const match = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
  if (match) {
    const index = form.pics.findIndex((pic) => pic.id === match[1]);
    return `${PIC_FIELD_LABELS[match[2]]} of person in charge ${index + 1}`;
  }

  return FIXED_LABELS[field] ?? field;
}

/** The field that should take focus after a failed Continue or Create. */
export function firstErrorField(errors: FieldErrors, form: WizardForm): string | undefined {
  return orderedKeys(form).find((field) => errors[field]);
}

/** Every message in form order, for the summary above the step. */
export function orderedErrors(errors: FieldErrors, form: WizardForm): string[] {
  return orderedKeys(form).filter((field) => errors[field]);
}

export function domIdForError(errors: FieldErrors, form: WizardForm): string | undefined {
  const field = firstErrorField(errors, form);
  return field ? domIdForField(field) : undefined;
}

/** Fields a patch invalidates; a changed campus also clears its unit. */
export function clearErrorsForPatch(
  errors: FieldErrors,
  patch: Partial<WizardForm>,
  form: WizardForm,
): FieldErrors {
  const next = { ...errors };

  for (const key of Object.keys(patch)) {
    delete next[key];
    if (key === 'campusId') delete next.unitId;
    if (key === 'startDate') delete next.endDate;
    if (key === 'pics') {
      delete next.pics;
      delete next.totalPic;
      for (const field of Object.keys(next)) {
        if (!field.startsWith('pic.')) continue;
        const id = field.split('.')[1];
        if (!form.pics.some((pic) => pic.id === id)) delete next[field];
      }
    }
  }

  return next;
}

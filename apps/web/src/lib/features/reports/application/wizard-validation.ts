import { emailSchema } from '@par/shared';

import { WIZARD_STEPS, type WizardForm, type WizardStep } from './wizard-form';

/**
 * Per-step and per-field validation (UI spec §7.5, §8.4). Continue validates
 * only the current step; a field validates on blur. Messages are the UI's, while
 * required-ness and formats mirror the shared Zod contract.
 */

export type FieldErrors = Record<string, string>;

export type WizardIssue = { field: string; label: string; message: string };

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
  totalStudents: 'Total number of students',
  totalPic: 'Total number of PIC',
  pics: 'People in charge',
  sdgIds: 'SDGs',
  narrative: 'Narrative',
};

const PIC_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
};

const PIC_KEYS = ['name', 'email', 'phone'] as const;

const STEP_FIELDS: Record<WizardStep, readonly string[]> = {
  1: ['type', 'classification', 'campusId', 'unitId', 'level'],
  2: ['title', 'startDate', 'endDate', 'location'],
  3: ['totalStudents', 'totalPic', 'pics', 'sdgIds'],
  4: ['narrative'],
};

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
    case 'totalStudents':
      return countError(form.totalStudents, 'students');
    case 'totalPic': {
      const message = countError(form.totalPic, 'PIC');
      if (message) return message;
      return form.pics.length === Number(form.totalPic)
        ? undefined
        : 'The PIC count does not match the number of PIC rows.';
    }
    case 'pics':
      return form.pics.length === 0 ? 'Add at least one person in charge.' : undefined;
    case 'sdgIds':
      return form.sdgIds.length === 0 ? 'Select at least one SDG.' : undefined;
    case 'narrative':
      return form.narrative.trim() ? undefined : 'Enter the narrative.';
    default:
      break;
  }

  const match = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
  if (!match) return undefined;

  const pic = form.pics.find((row) => row.id === match[1]);
  if (!pic) return undefined;

  if (match[2] === 'name') return pic.name.trim() ? undefined : 'Enter the name.';
  if (match[2] === 'email') {
    if (!pic.email.trim()) return undefined;
    return emailSchema.safeParse(pic.email.trim()).success
      ? undefined
      : 'Enter a valid email address.';
  }
  if (!pic.phone.trim()) return undefined;
  return PHONE_PATTERN.test(pic.phone.trim())
    ? undefined
    : 'Use digits, spaces, +, -, and parentheses.';
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

/** The first step with problems, used by Submit to send the user back. */
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
    'totalStudents',
    'totalPic',
    'pics',
    ...picKeys,
    'sdgIds',
    'narrative',
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

/** Linked summary in form order, so the first entry matches the first field. */
export function errorSummary(form: WizardForm, errors: FieldErrors): WizardIssue[] {
  return orderedKeys(form)
    .filter((field) => errors[field])
    .map((field) => ({ field, label: labelFor(field, form), message: errors[field] }));
}

export function firstErrorField(form: WizardForm, errors: FieldErrors): string | null {
  return orderedKeys(form).find((field) => errors[field]) ?? null;
}

/** DOM id for a wizard field, shared by labels, `aria-describedby`, and focus. */
export function fieldDomId(field: string): string {
  const match = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
  if (match) return `wiz-pic-${match[1]}-${match[2]}`;
  return `wiz-${field}`;
}

/** Fields whose error clears as soon as their own input changes. */
const ERROR_CLEAR: Record<string, string[]> = {
  type: ['type'],
  classification: ['classification'],
  campusId: ['campusId', 'unitId'],
  unitId: ['unitId'],
  level: ['level'],
  title: ['title'],
  startText: ['startDate'],
  startDate: ['startDate'],
  endText: ['endDate'],
  endDate: ['endDate'],
  location: ['location'],
  totalStudents: ['totalStudents'],
  totalPic: ['totalPic'],
  sdgIds: ['sdgIds'],
  narrative: ['narrative'],
};

/** Drops the errors an edit has just invalidated, so they do not linger. */
export function clearErrorsForPatch(errors: FieldErrors, patch: Partial<WizardForm>): FieldErrors {
  if (!hasErrors(errors)) return errors;

  const next = { ...errors };
  for (const key of Object.keys(patch)) {
    for (const field of ERROR_CLEAR[key] ?? []) delete next[field];
  }

  if ('pics' in patch) {
    for (const field of Object.keys(next)) {
      if (field.startsWith('pic.') || field === 'pics' || field === 'totalPic') {
        delete next[field];
      }
    }
  }

  return next;
}

/**
 * The inverse of `fieldDomId`, plus the "Other (specify)" inputs. Blur validation
 * reads the field back from the control that lost focus, so no component has to
 * wire a second event.
 */
export function fieldFromDomId(id: string): string | null {
  if (!id.startsWith('wiz-')) return null;
  const rest = id.slice(4).replace(/-other$/, '');
  const pic = /^pic-(.+)-(name|email|phone)$/.exec(rest);
  if (pic) return `pic.${pic[1]}.${pic[2]}`;
  return rest;
}

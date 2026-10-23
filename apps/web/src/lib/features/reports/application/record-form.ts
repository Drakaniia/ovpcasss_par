import type {
  Classification,
  Level,
  ReportActivityInput,
  ReportFormInput,
  ReportType,
  Unit,
} from '@par/shared';
import { CLASSIFICATIONS, LEVELS, REPORT_TYPES } from '@par/shared';

import { formatDate } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
import { isTypingTarget } from '$lib/shortcuts/keyboard';

/**
 * The office's record form (spec §12.1). Three steps, no narrative: the office
 * captures the activity and hands it to the personnel in charge, who write the
 * narrative later. Values are held as strings so empty fields are representable;
 * everything here is pure and unit-tested.
 */

export type WizardStep = 1 | 2 | 3;

export type WizardPic = { id: string; name: string; email: string; phone: string };

export type WizardForm = {
  type: ReportType | '';
  classification: Classification | '';
  campusId: string;
  unitId: string;
  department: string;
  office: string;
  level: Level | '';
  title: string;
  startDate: string;
  startText: string;
  endDate: string;
  endText: string;
  location: string;
  activityCount: string;
  totalStudents: string;
  totalPic: string;
  pics: WizardPic[];
  sdgIds: string[];
};

export type WizardOption = { value: string; label: string };

export const WIZARD_STEPS: readonly WizardStep[] = [1, 2, 3];

export const STEP_META: Record<WizardStep, { title: string; short: string }> = {
  1: { title: 'Activity classification', short: 'Classification' },
  2: { title: 'Activity', short: 'Activity' },
  3: { title: 'People and hand-over', short: 'People' },
};

export const REPORT_TYPE_OPTIONS: readonly WizardOption[] = REPORT_TYPES.map((type) => ({
  value: type,
  label: REPORT_TYPE_LABELS[type],
}));

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  CURRICULAR: 'Curricular',
  NON_CURRICULAR: 'Non-curricular',
};

const LEVEL_LABELS: Record<Level, string> = {
  GRADUATE: 'Graduate',
  UNDERGRADUATE: 'Undergraduate',
};

export const CLASSIFICATION_OPTIONS: readonly WizardOption[] = CLASSIFICATIONS.map(
  (classification) => ({ value: classification, label: CLASSIFICATION_LABELS[classification] }),
);

export const LEVEL_OPTIONS: readonly WizardOption[] = LEVELS.map((level) => ({
  value: level,
  label: LEVEL_LABELS[level],
}));

export function classificationLabel(value: Classification | ''): string {
  return value ? CLASSIFICATION_LABELS[value] : '—';
}

export function levelLabel(value: Level | ''): string {
  return value ? LEVEL_LABELS[value] : '—';
}

export function newId(prefix: string): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newPic(): WizardPic {
  return { id: newId('pic'), name: '', email: '', phone: '' };
}

export function emptyWizardForm(): WizardForm {
  return {
    type: '',
    classification: '',
    campusId: '',
    unitId: '',
    department: '',
    office: '',
    level: '',
    title: '',
    startDate: '',
    startText: '',
    endDate: '',
    endText: '',
    location: '',
    activityCount: '1',
    totalStudents: '',
    totalPic: '',
    pics: [newPic()],
    sdgIds: [],
  };
}

function countText(value: number | undefined): string {
  return value === undefined || value === null ? '' : String(value);
}

/** Loads a stored record into editable form state, keeping typed dates readable. */
export function formFromRecord(form: ReportFormInput): WizardForm {
  const base = emptyWizardForm();
  const pics = (form.pics ?? []).map((pic) => ({
    id: newId('pic'),
    name: pic.name,
    email: pic.email,
    phone: pic.phone ?? '',
  }));

  return {
    ...base,
    type: form.type,
    classification: form.classification,
    campusId: form.campusId,
    unitId: form.unitId,
    department: form.department ?? '',
    office: form.office ?? '',
    level: form.level,
    title: form.title,
    startDate: form.activityStartDate,
    startText: formatDate(form.activityStartDate),
    endDate: form.activityEndDate,
    endText: formatDate(form.activityEndDate),
    location: form.location,
    activityCount: countText(form.activityCount) || '1',
    totalStudents: countText(form.totalStudents),
    totalPic: countText(form.totalPic),
    pics: pics.length > 0 ? pics : base.pics,
    sdgIds: [...form.sdgIds],
  };
}

/** Converts to the shared contract; null means the record is not ready to save. */
export function toRecordInput(form: WizardForm): ReportActivityInput | null {
  if (!form.type || !form.classification || !form.campusId || !form.unitId || !form.level) {
    return null;
  }
  if (!form.title.trim() || !form.startDate || !form.endDate || !form.location.trim()) return null;

  const activityCount = Number(form.activityCount);
  const totalStudents = Number(form.totalStudents);
  const totalPic = Number(form.totalPic);
  if (!Number.isInteger(activityCount) || activityCount < 1) return null;
  if (!Number.isInteger(totalStudents) || totalStudents < 0) return null;
  if (!Number.isInteger(totalPic) || totalPic < 0) return null;
  if (form.sdgIds.length === 0) return null;

  const pics = form.pics
    .filter((pic) => pic.name.trim() !== '' && pic.email.trim() !== '')
    .map((pic) => ({
      name: pic.name.trim(),
      email: pic.email.trim().toLowerCase(),
      ...(pic.phone.trim() ? { phone: pic.phone.trim() } : {}),
    }));
  if (pics.length === 0) return null;

  return {
    type: form.type,
    classification: form.classification,
    campusId: form.campusId,
    unitId: form.unitId,
    ...(form.department.trim() ? { department: form.department.trim() } : {}),
    ...(form.office.trim() ? { office: form.office.trim() } : {}),
    level: form.level,
    title: form.title.trim(),
    activityStartDate: form.startDate,
    activityEndDate: form.endDate,
    location: form.location.trim(),
    activityCount,
    totalStudents,
    totalPic,
    pics,
    sdgIds: form.sdgIds,
  };
}

export function isWizardStep(value: number): value is WizardStep {
  return value === 1 || value === 2 || value === 3;
}

/** `?step=` is the source of truth; anything else falls back to step 1. */
export function stepFromParams(params: URLSearchParams): WizardStep {
  const parsed = Number(params.get('step'));
  return isWizardStep(parsed) ? parsed : 1;
}

/** Writes only what differs from the default so a new record is `/reports/new`. */
export function stepParams(step: WizardStep): string {
  return step === 1 ? '' : `step=${step}`;
}

/** Keyboard intent (§8.9): `Alt`+arrows move steps, never a requirement. */
export function wizardKeyAction(
  event: KeyboardEvent,
  step: WizardStep,
): { kind: 'step'; step: WizardStep } | null {
  if (event.metaKey || event.ctrlKey) return null;
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return null;
  if (event.repeat) return null;
  if ((event.target as Element | null)?.tagName === 'TEXTAREA') return null;
  // A bare arrow belongs to the focused control; only Alt+arrow moves a step.
  if (!event.altKey || arrowBelongsElsewhere(event)) return null;

  if (event.key === 'ArrowRight' && step < 3) {
    return { kind: 'step', step: (step + 1) as WizardStep };
  }

  if (event.key === 'ArrowLeft' && step > 1) {
    return { kind: 'step', step: (step - 1) as WizardStep };
  }

  return null;
}

/** True when the focused control owns the arrow instead of the wizard. */
function arrowBelongsElsewhere(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  if (isTypingTarget(event.target)) return true;

  const element = event.target as (Element & { closest?: (s: string) => Element | null }) | null;
  return Boolean(element?.closest?.('dialog[open], [role="dialog"]'));
}

/* ---------- Options ---------- */

export function unitsForCampus(units: readonly Unit[], campusId: string): Unit[] {
  return units
    .filter((unit) => unit.campusId === campusId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function unitLabel(unit: Unit): string {
  return unit.isActive ? unit.name : `${unit.name} (inactive)`;
}

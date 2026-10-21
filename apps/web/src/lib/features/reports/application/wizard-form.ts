import type {
  Classification,
  Level,
  ReportDraftForm,
  ReportFormInput,
  ReportType,
  Unit,
} from '@par/shared';
import { CLASSIFICATIONS, LEVELS, REPORT_TYPES } from '@par/shared';

import { formatDate } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
import { isTypingTarget } from '$lib/shortcuts/keyboard';

/**
 * Wizard form state (UI phase 06, spec §7.5). The form is edited as strings so
 * empty fields are representable, then converted to the shared contract on save
 * and submit. Everything here is pure and unit-tested.
 */

export type WizardStep = 1 | 2 | 3 | 4;

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
  totalStudents: string;
  totalPic: string;
  pics: WizardPic[];
  sdgIds: string[];
  narrative: string;
};

export type WizardOption = { value: string; label: string };

export const WIZARD_STEPS: readonly WizardStep[] = [1, 2, 3, 4];

export const STEP_META: Record<WizardStep, { title: string; short: string }> = {
  1: { title: 'Activity classification', short: 'Classification' },
  2: { title: 'Activity details', short: 'Details' },
  3: { title: 'People and outcomes', short: 'People' },
  4: { title: 'Narrative and attachments', short: 'Narrative' },
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
    totalStudents: '',
    totalPic: '',
    pics: [newPic()],
    sdgIds: [],
    narrative: '',
  };
}

function countText(value: number | undefined): string {
  return value === undefined || value === null ? '' : String(value);
}

/** Restores a stored draft into editable form state, keeping typed dates readable. */
export function formFromDraft(form: ReportDraftForm): WizardForm {
  const start = form.activityStartDate ?? '';
  const end = form.activityEndDate ?? '';
  const base = emptyWizardForm();
  const pics = (form.pics ?? []).map((pic) => ({
    id: newId('pic'),
    name: pic.name ?? '',
    email: pic.email ?? '',
    phone: pic.phone ?? '',
  }));

  return {
    ...base,
    type: (form.type as ReportType | undefined) ?? '',
    classification: (form.classification as Classification | undefined) ?? '',
    campusId: form.campusId ?? '',
    unitId: form.unitId ?? '',
    department: form.department ?? '',
    office: form.office ?? '',
    level: (form.level as Level | undefined) ?? '',
    title: form.title ?? '',
    startDate: start,
    startText: start ? formatDate(start) : '',
    endDate: end,
    endText: end ? formatDate(end) : '',
    location: form.location ?? '',
    totalStudents: countText(form.totalStudents),
    totalPic: countText(form.totalPic),
    pics: pics.length > 0 ? pics : base.pics,
    sdgIds: form.sdgIds ?? [],
    narrative: form.narrative ?? '',
  };
}

/**
 * Stores the current form as a partial draft. Empty values are dropped so the
 * draft stays a faithful record of what the submitter actually entered.
 */
export function draftFormFromWizard(form: WizardForm): ReportDraftForm {
  const draft: ReportDraftForm = {};

  if (form.type) draft.type = form.type;
  if (form.classification) draft.classification = form.classification;
  if (form.campusId) draft.campusId = form.campusId;
  if (form.unitId) draft.unitId = form.unitId;
  if (form.department.trim()) draft.department = form.department.trim();
  if (form.office.trim()) draft.office = form.office.trim();
  if (form.level) draft.level = form.level;
  if (form.title) draft.title = form.title;
  if (form.startDate) draft.activityStartDate = form.startDate;
  if (form.endDate) draft.activityEndDate = form.endDate;
  if (form.location) draft.location = form.location;
  if (form.totalStudents !== '') draft.totalStudents = Number(form.totalStudents);
  if (form.totalPic !== '') draft.totalPic = Number(form.totalPic);
  draft.pics = form.pics.map((pic) => ({
    name: pic.name,
    ...(pic.email.trim() ? { email: pic.email.trim() } : {}),
    ...(pic.phone.trim() ? { phone: pic.phone.trim() } : {}),
  }));
  draft.sdgIds = [...form.sdgIds];
  if (form.narrative) draft.narrative = form.narrative;

  return draft;
}

/** Converts to the shared contract; null means the form is not submit-ready. */
export function toReportFormInput(form: WizardForm): ReportFormInput | null {
  if (!form.type || !form.classification || !form.campusId || !form.unitId || !form.level) {
    return null;
  }
  if (!form.title.trim() || !form.startDate || !form.endDate || !form.location.trim()) return null;
  if (!form.narrative.trim()) return null;

  const totalStudents = Number(form.totalStudents);
  const totalPic = Number(form.totalPic);
  if (!Number.isInteger(totalStudents) || !Number.isInteger(totalPic)) return null;

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
    totalStudents,
    totalPic,
    pics: form.pics.map((pic) => ({
      name: pic.name.trim(),
      ...(pic.email.trim() ? { email: pic.email.trim() } : {}),
      ...(pic.phone.trim() ? { phone: pic.phone.trim() } : {}),
    })),
    sdgIds: form.sdgIds,
    narrative: form.narrative,
  };
}

export function isWizardStep(value: number): value is WizardStep {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** `?step=` is the source of truth; anything else falls back to step 1. */
export function stepFromParams(params: URLSearchParams): WizardStep {
  const parsed = Number(params.get('step'));
  return isWizardStep(parsed) ? parsed : 1;
}

export function stepFromDraft(step: number | undefined): WizardStep {
  return step !== undefined && isWizardStep(step) ? step : 1;
}

export function draftIdFromParams(params: URLSearchParams): string {
  return params.get('draft')?.trim() ?? '';
}

/** Writes only what differs from the default so a new report is `/reports/new`. */
export function stepParams(step: WizardStep, draftId = ''): string {
  const params = new URLSearchParams();
  if (step !== 1) params.set('step', String(step));
  if (draftId) params.set('draft', draftId);
  return params.toString();
}

/**
 * Wizard route for a step. The draft id travels in the URL from the first
 * render, so a reload can find the IndexedDB copy of a report still on step 1.
 * `basePath` keeps a resumed draft on its own route (`/reports/[id]/edit`,
 * spec §7.4) instead of moving it to `/reports/new`.
 */
export function wizardPath(step: WizardStep, draftId = '', basePath = '/reports/new'): string {
  const search = stepParams(step, draftId);
  return search ? `${basePath}?${search}` : basePath;
}

/**
 * Keyboard intent (§8.9): `→`/`←` move steps, with `Alt` as the same chord for
 * when a text field holds the arrow. Keyboard is a shortcut, never a
 * requirement, and step jumps stay out of the narrative editor. `Ctrl/Cmd+S`
 * belongs to the chrome's command registry (window chrome spec §9.5), so it is
 * not handled here — one key, one path.
 */
export function wizardKeyAction(
  event: KeyboardEvent,
  step: WizardStep,
): { kind: 'step'; step: WizardStep } | null {
  if (event.metaKey || event.ctrlKey) return null;
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return null;

  // Holding the key must not fly through the steps; one press, one move.
  if (event.repeat) return null;

  // The narrative editor owns the arrows; anywhere else they move steps.
  if ((event.target as Element | null)?.tagName === 'TEXTAREA') return null;

  // A bare arrow belongs to whatever is focused: a text field, an open dialog,
  // or a widget that already handled the key.
  if (!event.altKey && arrowBelongsElsewhere(event)) return null;

  if (event.key === 'ArrowRight' && step < 4) {
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

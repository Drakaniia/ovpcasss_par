import type { Campus, Department, Office, ReportDetail, Sdg, Unit } from '@par/shared';
import { tick } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';

import {
  emptyWizardForm,
  formFromRecord,
  newPic,
  toRecordInput,
  unitsForCampus,
  type WizardForm,
  type WizardPic,
  type WizardStep,
} from './record-form';
import {
  clearErrorsForPatch,
  domIdForError,
  fieldFromDomId,
  firstInvalidStep,
  hasErrors,
  validateEditedField,
  validateField,
  validateStep,
  type FieldErrors,
} from './record-validation';
import { isTypingTarget } from '$lib/shortcuts/keyboard';

export type RecordReferences = {
  campuses: Campus[];
  units: Unit[];
  departments: Department[];
  offices: Office[];
  sdgs: Sdg[];
};

const EMPTY_REFERENCES: RecordReferences = {
  campuses: [],
  units: [],
  departments: [],
  offices: [],
  sdgs: [],
};

export type RecordFormOptions = {
  /** `edit` loads the stored record and PATCHes it; `create` POSTs a new one. */
  mode: 'create' | 'edit';
  id?: string;
  /** Loaded by the route in edit mode. */
  detail?: ReportDetail;
};

function authed(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function isEmptyValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return String(value ?? '').trim() === '';
}

/**
 * Create/edit state for the office's record form (spec §12.1). The admin never
 * writes a narrative here: the record is registered, minted, and handed to the
 * personnel in charge. Validation follows bug phases 02 and 03 — an empty
 * required field is flagged on an advance attempt, never on blur alone.
 */
export class RecordFormState {
  auth = $state<'loading' | 'ready' | 'denied' | 'error'>('loading');
  ready = $state(false);
  references = $state<RecordReferences>(EMPTY_REFERENCES);
  referencesError = $state<{ requestId?: string } | null>(null);

  form = $state<WizardForm>(emptyWizardForm());
  step = $state<WizardStep>(1);
  errors = $state<FieldErrors>({});
  attempted = $state<ReadonlySet<WizardStep>>(new SvelteSet());
  saving = $state(false);
  /** Required once a narrative has been submitted (spec §9.2). */
  reason = $state('');
  saveError = $state<{ message: string; requestId?: string } | null>(null);
  created = $state<{ id: string; referenceNo: string; sentTo: number } | null>(null);

  /** Fields the reporter actually changed; blur only checks these. */
  private edited = new SvelteSet<string>();
  /** Fields that have held content at least once, so clearing them is an edit. */
  private filled = new SvelteSet<string>();
  readonly mode: 'create' | 'edit';
  /** One key per form, so a retried save replays instead of minting a second AR No. */
  private readonly createKey = crypto.randomUUID();
  private readonly detail: ReportDetail | undefined;
  private readonly id: string | undefined;

  constructor(options: RecordFormOptions) {
    this.mode = options.mode;
    this.id = options.id;
    this.detail = options.detail;
  }

  get heading(): string {
    return this.mode === 'create' ? 'New record' : 'Edit record';
  }

  get units(): Unit[] {
    return unitsForCampus(this.references.units, this.form.campusId);
  }

  get summaryVisible(): boolean {
    return this.attempted.has(this.step) && hasErrors(this.errors);
  }

  async boot(): Promise<void> {
    if (this.edit) {
      if (!this.detail) {
        this.auth = 'denied';
        return;
      }
      this.form = formFromRecord(this.detail.form);
      this.seedEdited();
    }

    try {
      await this.loadReferences();
      this.auth = 'ready';
      this.ready = true;
    } catch (error) {
      if (authed(error)) {
        this.auth = 'denied';
        return;
      }
      this.auth = 'error';
    }
  }

  private get edit(): boolean {
    return this.mode === 'edit';
  }

  async loadReferences(): Promise<void> {
    this.referencesError = null;

    try {
      const [campuses, units, departments, offices, sdgs] = await Promise.all([
        api.reference.list('campuses'),
        api.reference.list('units'),
        api.reference.list('departments'),
        api.reference.list('offices'),
        api.reference.list('sdgs'),
      ]);

      this.references = {
        campuses: campuses.items,
        units: units.items,
        departments: departments.items,
        offices: offices.items,
        sdgs: sdgs.items,
      };
    } catch (error) {
      this.referencesError = { requestId: error instanceof ApiError ? error.requestId : undefined };
      throw error;
    }
  }

  /** A stored, complete record is not flagged on open: every value counts as touched. */
  private seedEdited(): void {
    const keys: string[] = [
      'type',
      'classification',
      'campusId',
      'unitId',
      'level',
      'title',
      'startDate',
      'endDate',
      'location',
      'activityCount',
      'totalStudents',
      'totalPic',
      'sdgIds',
    ];

    for (const key of keys) this.edited.add(key);
    for (const pic of this.form.pics) {
      this.edited.add(`pic.${pic.id}.name`);
      this.edited.add(`pic.${pic.id}.email`);
      this.filled.add(`pic.${pic.id}.name`);
      this.filled.add(`pic.${pic.id}.email`);
    }
  }

  setDirectory(entity: 'departments' | 'offices', entries: readonly (Department | Office)[]): void {
    this.references =
      entity === 'departments'
        ? { ...this.references, departments: entries as Department[] }
        : { ...this.references, offices: entries as Office[] };
  }

  patchForm(patch: Partial<WizardForm>): void {
    const before = this.form;
    this.form = { ...this.form, ...patch };
    this.markEdited(patch, before);
    this.errors = clearErrorsForPatch(this.errors, patch, this.form);

    // A new campus cannot keep the previous campus's college or unit.
    if (patch.campusId !== undefined && before.campusId !== patch.campusId) {
      this.form = { ...this.form, unitId: '' };
    }
  }

  patchPic(id: string, patch: Partial<WizardPic>): void {
    const before = this.form;
    this.form = {
      ...this.form,
      pics: this.form.pics.map((pic) => (pic.id === id ? { ...pic, ...patch } : pic)),
    };

    for (const [key, value] of Object.entries(patch)) {
      this.markField(`pic.${id}.${key}`, value, before);
    }
    this.recheckCount(before);
    this.errors = clearErrorsForPatch(this.errors, { pics: this.form.pics }, this.form);
  }

  /** The PIC count is read from the rows, so adding one increments it. */
  addPic(): void {
    const before = this.form;
    const pics = [...this.form.pics, newPic()];
    this.form = { ...this.form, pics, totalPic: String(pics.length) };
    this.recheckCount(before);
    this.errors = clearErrorsForPatch(this.errors, { pics }, this.form);
  }

  removePic(id: string): void {
    const before = this.form;
    const pics = this.form.pics.filter((pic) => pic.id !== id);
    this.form = { ...this.form, pics, totalPic: String(pics.length) };
    for (const key of ['name', 'email', 'phone']) {
      this.edited.delete(`pic.${id}.${key}`);
      this.filled.delete(`pic.${id}.${key}`);
    }
    this.recheckCount(before);
    this.errors = clearErrorsForPatch(this.errors, { pics: this.form.pics }, this.form);
  }

  private markEdited(patch: Partial<WizardForm>, before: WizardForm): void {
    for (const [key, value] of Object.entries(patch)) {
      this.markField(key, value, before);
    }

    if (patch.pics) {
      for (const pic of patch.pics) {
        for (const key of ['name', 'email', 'phone'] as const) {
          this.markField(`pic.${pic.id}.${key}`, pic[key], before);
        }
      }
    }
  }

  private markField(field: string, value: unknown, before: WizardForm): void {
    const was = this.readField(field, before);
    if (String(was ?? '') === String(value ?? '')) return;

    this.edited.add(field);
    if (!isEmptyValue(value)) this.filled.add(field);
  }

  private readField(field: string, form: WizardForm): unknown {
    const pic = /^pic\.(.+)\.(name|email|phone)$/.exec(field);
    if (pic) {
      const row = form.pics.find((entry) => entry.id === pic[1]);
      return row ? row[pic[2] as 'name' | 'email' | 'phone'] : undefined;
    }
    return form[field as keyof WizardForm];
  }

  /** The PIC count message appears once a count or the row set has been edited. */
  private recheckCount(before: WizardForm): void {
    if (!this.edited.has('totalPic') && !this.edited.has('pics')) return;

    const message = validateField('totalPic', this.form);
    const next = { ...this.errors };
    if (message && Number(this.form.totalPic) !== this.form.pics.length) next.totalPic = message;
    else delete next.totalPic;
    this.errors = next;

    if (before.pics !== this.form.pics) this.edited.add('pics');
  }

  /** Blur saves nothing and only checks a field the reporter edited. */
  onFocusOut(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !isTypingTarget(target)) return;
    if (this.focusStaysInsideField(target, event.relatedTarget)) return;
    if (!target.id) return;

    const field = fieldFromDomId(target.id);
    if (!field || !this.edited.has(field)) return;

    const wasCleared = this.filled.has(field) && isEmptyValue(this.readField(field, this.form));
    const message = validateEditedField(field, this.form, { wasCleared });
    const next = { ...this.errors };
    if (message) next[field] = message;
    else delete next[field];
    this.errors = next;
  }

  /**
   * Opening a calendar, a dropdown, or a row control is not leaving the field
   * (bug phase 02 §3.3). Only a move to another typing surface checks it.
   */
  private focusStaysInsideField(target: HTMLElement, related: EventTarget | null): boolean {
    if (related instanceof HTMLElement) {
      if (target.closest('.field')?.contains(related)) return true;
      if (
        related.tagName === 'BUTTON' ||
        related.getAttribute('role') === 'option' ||
        related.hasAttribute('aria-haspopup') ||
        related.closest('[role="listbox"], dialog, [role="dialog"]')
      ) {
        return true;
      }
    }
    return false;
  }

  async setStep(next: WizardStep): Promise<void> {
    if (next === this.step) return;
    this.step = next;
    await tick();
    document.getElementById(`wizard-step-${next}`)?.focus();
  }

  /** Continue validates the current step only and lands on its first problem. */
  async continue(): Promise<boolean> {
    this.attempted = new SvelteSet([...this.attempted, this.step]);
    const errors = validateStep(this.step, this.form);
    this.errors = errors;

    if (hasErrors(errors)) {
      await this.focusFirstError();
      return false;
    }

    if (this.step < 3) {
      await this.setStep((this.step + 1) as WizardStep);
      return true;
    }

    return true;
  }

  /** Clicking a later step dot validates every step it skips. */
  async goTo(target: WizardStep): Promise<void> {
    if (target === this.step) return;
    if (target < this.step) {
      await this.setStep(target);
      return;
    }

    const invalid = firstInvalidStep(this.form);
    if (invalid && invalid.step < target) {
      this.attempted = new SvelteSet([...this.attempted, invalid.step]);
      this.errors = invalid.errors;
      await this.setStep(invalid.step);
      await this.focusFirstError();
      return;
    }

    await this.setStep(target);
  }

  private async focusFirstError(): Promise<void> {
    await tick();
    const id = domIdForError(this.errors, this.form);
    if (!id) return;
    document.getElementById(id)?.focus();
  }

  /** Create or save the record. A failed advance never sends a request. */
  async save(): Promise<boolean> {
    if (this.saving) return false;

    const invalid = firstInvalidStep(this.form);
    if (invalid) {
      this.attempted = new SvelteSet([...this.attempted, invalid.step]);
      this.errors = invalid.errors;
      this.saveError = null;
      await this.setStep(invalid.step);
      await this.focusFirstError();
      return false;
    }

    const input = toRecordInput(this.form);
    if (!input) {
      this.saveError = { message: 'Check the highlighted fields.' };
      return false;
    }

    const submitted =
      this.edit && (this.detail?.status === 'SUBMITTED' || this.detail?.status === 'RETURNED');
    if (submitted && !this.reason.trim()) {
      this.saveError = {
        message:
          'Write why the activity details were corrected. Every personnel in charge is told.',
      };
      return false;
    }

    this.saving = true;
    this.saveError = null;

    try {
      if (this.edit) {
        await api.reports.update(
          this.id ?? '',
          { ...input, ...(this.reason.trim() ? { reason: this.reason.trim() } : {}) },
          this.detail?.version,
        );
        return true;
      }

      const head = await api.reports.create(input, this.createKey);
      this.created = { id: head.id, referenceNo: head.referenceNo, sentTo: head.sentTo };
      return true;
    } catch (error) {
      if (authed(error)) {
        this.auth = 'denied';
        return false;
      }

      this.saveError = {
        message: error instanceof ApiError ? error.message : 'The record was not saved. Try again.',
        requestId: error instanceof ApiError ? error.requestId : undefined,
      };
      return false;
    } finally {
      this.saving = false;
    }
  }
}

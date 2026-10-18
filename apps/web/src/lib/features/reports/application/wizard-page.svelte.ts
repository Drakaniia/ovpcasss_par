import type { ReportDetail, ReportValidationIssue } from '@par/shared';
import { goto } from '$app/navigation';
import { tick, untrack } from 'svelte';
import { SvelteURLSearchParams } from 'svelte/reactivity';

import { ApiError } from '$lib/api/http';
import { type AttachmentItem } from '$lib/features/attachments/application/attachment-items';
import { createPlatform } from '$lib/platform';
import type { Platform } from '$lib/platform/contracts';
import { isTypingTarget } from '$lib/shortcuts/keyboard';
import { toast } from '$lib/toast/toast.svelte';

import {
  attachmentBlockReason,
  attachmentCountLabel,
  completenessItems,
  labelOptionsFor,
} from './wizard-completeness';
import { WizardConflict } from './wizard-conflict.svelte';
import { WizardDraftFile } from './wizard-draft-file.svelte';
import { newDraftId, newIdempotencyKey } from './wizard-draft';
import { WizardLeave, type NavigationTargetLike } from './wizard-leave.svelte';
import {
  draftIdFromParams,
  emptyWizardForm,
  formFromDraft,
  stepFromParams,
  toReportFormInput,
  wizardKeyAction,
  wizardPath,
  type WizardForm,
  type WizardStep,
} from './wizard-form';
import {
  emptyWizardReferences,
  loadWizardReferences,
  resolveWizardAccount,
  submitNewReport,
  type WizardAuth,
  type WizardReferenceData,
} from './wizard-requests';
import { reviewSections } from './wizard-review';
import {
  clearErrorsForPatch,
  fieldFromDomId,
  firstInvalidStep,
  hasErrors,
  validateField,
  validateStep,
  type FieldErrors,
} from './wizard-validation';

/**
 * Page state and actions for the create wizard (UI phase 06). The component owns
 * focus and lifecycle; this controller owns steps, validation, submit, and the
 * conflict path. Drafts live in `WizardDraftFile`, mirroring the phase 07 split.
 */

export type WizardFocusHooks = {
  step: () => void;
  errors: () => void;
};

export type WizardPageOptions = {
  search: string;
  focus: WizardFocusHooks;
  /** Where the step links point; a resumed draft keeps its own route. */
  basePath?: string;
  /** A server draft to continue (spec §7.4); the wizard owns its form. */
  resume?: ReportDetail;
};

export class WizardPageState {
  auth = $state<WizardAuth>('loading');
  ready = $state(false);
  referencesLoading = $state(true);
  referencesError = $state<{ requestId?: string } | null>(null);
  references = $state<WizardReferenceData>(emptyWizardReferences());

  readonly draft: WizardDraftFile;
  readonly conflict = new WizardConflict();
  readonly leave: WizardLeave;

  form = $state<WizardForm>(emptyWizardForm());
  step = $state<WizardStep>(1);
  errors = $state<FieldErrors>({});
  attachments = $state<AttachmentItem[]>([]);
  submitting = $state(false);
  submitError = $state<{ message: string; requestId?: string } | null>(null);
  serverIssues = $state<ReportValidationIssue[]>([]);

  labelOptions = $derived(labelOptionsFor(this.references.requirements, this.form.type));
  completeness = $derived(
    completenessItems(this.form, this.references.requirements, this.attachments),
  );
  blockReason = $derived(attachmentBlockReason(this.attachments));
  sections = $derived(
    reviewSections(
      this.form,
      {
        campuses: this.references.campuses,
        units: this.references.units,
        sdgs: this.references.sdgs,
      },
      attachmentCountLabel(this.attachments.length),
    ),
  );

  private platform: Platform | null = null;
  private readonly idempotencyKey = newIdempotencyKey();
  private readonly params: URLSearchParams;
  private readonly focus: WizardFocusHooks;
  private readonly basePath: string;
  private readonly resume: ReportDetail | undefined;

  constructor(options: WizardPageOptions) {
    this.params = new SvelteURLSearchParams(options.search);
    this.focus = options.focus;
    this.basePath = options.basePath ?? '/reports/new';
    this.resume = options.resume;
    this.draft = new WizardDraftFile(
      untrack(
        () => (options.resume?.id ?? draftIdFromParams(this.params)) || newDraftId(),
      ),
    );
    this.step = untrack(() => stepFromParams(this.params));
    this.leave = new WizardLeave(
      () => this.draft.dirty,
      () => this.saveDraft(),
      () => {
        this.draft.dirty = false;
      },
      () => this.basePath,
    );
  }

  /** Account, platform, form options, and any saved draft, in that order. */
  async boot(): Promise<void> {
    this.auth = await resolveWizardAccount();
    if (this.auth !== 'ready') return;

    try {
      this.platform = await createPlatform();
    } catch {
      this.platform = null;
    }

    await Promise.all([this.loadReferences(), this.restoreForm()]);
    this.ready = true;
    await this.ensureDraftInUrl();
  }

  async loadReferences(): Promise<void> {
    this.referencesLoading = true;
    this.referencesError = null;

    const result = await loadWizardReferences();
    if ('references' in result) this.references = result.references;
    else this.referencesError = { requestId: result.requestId };

    this.referencesLoading = false;
  }

  /**
   * The form comes from the device if this draft has local edits, and from the
   * server copy the route already loaded when it does not.
   */
  private async restoreForm(): Promise<void> {
    if (await this.restoreDraft()) return;
    if (this.resume) this.hydrateFromServer(this.resume);
  }

  private async restoreDraft(): Promise<boolean> {
    const restored = await this.draft.restore(this.platform, this.draft.id, this.params);
    if (!restored) return false;

    this.form = restored.form;
    this.step = restored.step;
    this.attachments = restored.attachments;
    return true;
  }

  /** A server draft opened from My reports (spec §7.4). */
  private hydrateFromServer(detail: ReportDetail): void {
    const adopted = this.draft.adopt(detail);
    this.form = adopted.form;
    this.attachments = adopted.attachments;
  }

  /** Where a step change navigates: a resumed draft is identified by its route. */
  private pathFor(step: WizardStep): string {
    return wizardPath(step, this.resume ? '' : this.draft.id, this.basePath);
  }

  /** A new report keeps its draft id in the URL so a reload finds the local copy. */
  private async ensureDraftInUrl(): Promise<void> {
    if (this.resume || this.params.has('draft')) return;
    await goto(this.pathFor(this.step), { replace: true });
  }

  patchForm(patch: Partial<WizardForm>): void {
    this.form = { ...this.form, ...patch };
    this.draft.dirty = true;
    this.errors = clearErrorsForPatch(this.errors, patch);
  }

  saveDraft(): Promise<boolean> {
    return this.draft.save(this.platform, { step: this.step, form: this.form });
  }

  ensureServerDraft(): Promise<string> {
    const input = toReportFormInput(this.form);
    if (!input) throw new Error('Complete the report details before attaching files.');
    return this.draft.ensureServer(this.platform, { step: this.step, form: this.form }, input);
  }

  /** Blur validates one field only, so tabbing through never flags untouched steps. */
  validateOnBlur(controlId: string): void {
    const field = fieldFromDomId(controlId);
    if (!field) return;

    const message = validateField(field, this.form);
    const next = { ...this.errors };
    if (message) next[field] = message;
    else delete next[field];
    this.errors = next;
  }

  async setStep(next: WizardStep): Promise<void> {
    if (next === this.step) return;
    if (this.draft.dirty) void this.saveDraft();

    this.step = next;
    await goto(this.pathFor(next));
    await tick();
    this.focus.step();
  }

  async tryGoToStep(target: WizardStep): Promise<void> {
    if (target === this.step) return;

    if (target > this.step) {
      for (let current = this.step; current < target; current += 1) {
        const stepErrors = validateStep(current as WizardStep, this.form);
        if (hasErrors(stepErrors)) {
          this.errors = stepErrors;
          if (current !== this.step) await this.setStep(current as WizardStep);
          await tick();
          this.focus.errors();
          return;
        }
      }
    }

    this.errors = {};
    await this.setStep(target);
  }

  async submit(): Promise<void> {
    if (this.submitting) return;

    const invalid = firstInvalidStep(this.form);
    if (invalid) {
      this.errors = invalid.errors;
      await this.tryGoToStep(invalid.step);
      this.errors = invalid.errors;
      await tick();
      this.focus.errors();
      return;
    }

    const input = toReportFormInput(this.form);
    if (!input) return;

    this.submitting = true;
    this.submitError = null;
    this.serverIssues = [];

    try {
      const reportId = await this.ensureServerDraft();
      const outcome = await submitNewReport({
        reportId,
        input,
        idempotencyKey: this.idempotencyKey,
      });

      if (outcome.kind === 'invalid') {
        this.serverIssues = outcome.issues;
        await tick();
        this.focus.errors();
        return;
      }

      if (outcome.kind === 'conflict') {
        await this.conflict.load(reportId, this.form, this.references);
        return;
      }

      if (outcome.kind === 'error') {
        this.submitError = {
          message: outcome.message,
          ...(outcome.requestId ? { requestId: outcome.requestId } : {}),
        };
        return;
      }

      await this.draft.remove(this.platform);
      toast.success(`Report submitted · ${outcome.result.trackingNumber}`, {
        copy: outcome.result.trackingNumber,
      });
      await this.leave.navigate(`/reports/${outcome.result.id}`);
    } catch (error) {
      this.submitError = {
        message:
          error instanceof ApiError
            ? error.message
            : 'The report was not submitted. Try again.',
        ...(error instanceof ApiError && error.requestId
          ? { requestId: error.requestId }
          : {}),
      };
    } finally {
      this.submitting = false;
    }
  }

  /** The author chose the newer server copy; local edits are abandoned on purpose. */
  applyServerCopy(): void {
    const server = this.conflict.takeServerCopy();
    if (!server) return;

    this.draft.serverId = server.id;
    this.draft.version = server.version;
    this.draft.dirty = true;
    this.form = formFromDraft(server.form);
    this.errors = {};
    this.submitError = null;
    this.serverIssues = [];
    void this.saveDraft();
  }

  keepRestoredDraft(): void {
    this.draft.detach();
    void this.saveDraft();
  }

  async discardRestoredDraft(): Promise<void> {
    await this.draft.remove(this.platform);
    this.draft.reset();
    this.form = emptyWizardForm();
    this.step = 1;
    this.attachments = [];
    // Starting a fresh report leaves a resumed draft's route behind.
    await goto(this.resume ? '/reports/new' : this.pathFor(1), { replace: true });
  }

  /** Autosave on blur and on a timer; failures stay inline in the header. */
  onFocusOut(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !isTypingTarget(target)) return;

    void this.saveDraft();
    if (target.id) this.validateOnBlur(target.id);
  }

  onKeydown(event: KeyboardEvent): void {
    const action = wizardKeyAction(event, this.step);
    if (!action) return;

    event.preventDefault();
    if (action.kind === 'save') {
      void this.saveDraft();
    } else if (action.step > this.step) {
      void this.tryGoToStep(action.step);
    } else {
      void this.setStep(action.step);
    }
  }

  /** Browser back/forward moves between steps without a leave prompt. */
  handleBeforeNavigate(to: NavigationTargetLike, cancel: () => void): void {
    if (this.leave.ask(to)) cancel();
  }

  syncStep(search: string): void {
    const fromUrl = stepFromParams(new SvelteURLSearchParams(search));
    if (fromUrl !== untrack(() => this.step) && !this.leave.open) this.step = fromUrl;
  }

  autoSave(): void {
    if (this.draft.dirty) void this.saveDraft();
  }
}

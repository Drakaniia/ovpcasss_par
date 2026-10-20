import type { ReportDetail, ReportFormInput } from '@par/shared';
import { goto } from '$app/navigation';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';

import { ApiError } from '$lib/api/http';
import { createPlatform } from '$lib/platform';
import { clearSession, session } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

import {
  itemFromAttachment,
  type AttachmentItem,
} from '$lib/features/attachments/application/attachment-items';

import {
  editAccessFor,
  returnCallout,
  returnHeader,
  visibleFlags,
  type IssueSummaryItem,
  type SaveKind,
} from './edit-returned';
import { collectFormErrors, formIssueState, serverIssueState } from './edit-returned-form';
import {
  ensureActiveSession,
  fetchReportBundle,
  resubmitKey,
  resubmitReport,
  saveReport,
  validateReport,
} from './edit-returned-requests';
import {
  emptyReferences,
  FIELD_ORDER,
  fieldValuesEqual,
  type EditReferences,
  type ReportFieldKey,
} from './report-field-values';
import { ConflictController } from './edit-returned-conflict.svelte';
import { LocalMirror } from './edit-returned-mirror';
import { attachmentBlockReason, labelOptionsFor } from './wizard-completeness';
import {
  draftFormFromWizard,
  emptyWizardForm,
  formFromDraft,
  toReportFormInput,
  type WizardForm,
} from './wizard-form';

/**
 * Page state and actions for editing a returned report (UI phase 07). The
 * component owns focus, scrolling, lifecycle, and dialogs; this controller owns
 * the server copies, local mirror, validation, and transitions.
 */

/** `local` is a draft saved on this device that the server does not know yet. */
export type EditView = 'loading' | 'ready' | 'local' | 'not-found' | 'error';

export class EditReturnedState {
  view = $state<EditView>('loading');
  requestId = $state<string | undefined>();
  detail = $state<ReportDetail | null>(null);
  references = $state<EditReferences>(emptyReferences());
  form = $state<WizardForm>(emptyWizardForm());
  attachments = $state<AttachmentItem[]>([]);
  savedForm = $state<ReportFormInput | null>(null);
  /** Version the local copy is based on; `if-match` uses this, not the newest read. */
  baseVersion = $state(0);

  saveKind = $state<SaveKind>('idle');
  saveAt = $state<string | undefined>();
  localSavedAt = $state<string | undefined>();
  busy = $state<'saving' | 'resubmitting' | null>(null);

  alert = $state<string | null>(null);
  serverError = $state<string | null>(null);
  fieldErrors = $state<Record<string, string>>({});
  issues = $state<IssueSummaryItem[]>([]);
  readonly conflicts: ConflictController;

  clearedFlags = $state<ReadonlySet<ReportFieldKey>>(new SvelteSet());

  private readonly id: string;
  private readonly mirror: LocalMirror;

  access = $derived.by(() =>
    this.detail
      ? editAccessFor({
          role: session.user?.role ?? null,
          userId: session.user?.id ?? null,
          ownerUserId: this.detail.ownerUserId,
          status: this.detail.status,
          returnEvent: this.detail.returnEvent,
          returnedAt: this.detail.returnedAt,
        })
      : null,
  );
  returned = $derived.by(() => (this.detail ? returnHeader(this.detail) : null));
  callout = $derived.by(() => (this.detail ? returnCallout(this.detail) : null));
  flaggedKeys = $derived.by(
    () => new SvelteSet(this.callout ? visibleFlags(this.callout.flagged, this.clearedFlags) : []),
  );
  /** Why Resubmit is unavailable, stated next to the button. A missing label is
   *  reported by the completeness checklist inside the form, never as a block. */
  blockReason = $derived(attachmentBlockReason(this.attachments));
  labelOptions = $derived.by(() => labelOptionsFor(this.references.requirements, this.form.type));
  dirty = $derived.by(() => {
    const saved = this.savedForm;
    if (!saved) return false;
    const current = draftFormFromWizard(this.form);
    return FIELD_ORDER.some((key) => !fieldValuesEqual(key, saved, current));
  });
  headerSaveAt = $derived(this.saveKind === 'local' ? this.localSavedAt : this.saveAt);
  get conflict() {
    return this.conflicts.conflict;
  }

  get conflictLine() {
    return this.conflicts.line;
  }

  constructor(id: string) {
    this.id = id;
    this.mirror = new LocalMirror(`edit-${id}`);
    this.conflicts = new ConflictController({
      reportId: id,
      form: () => this.form,
      references: () => this.references,
      title: () => this.detail?.form.title ?? 'this report',
      applyServer: (server) => this.applyServerCopy(server),
    });
  }

  closeConflict() {
    this.conflicts.close();
  }

  copyEdits() {
    return this.conflicts.copyEdits();
  }

  useServerVersion() {
    return this.conflicts.useServerVersion();
  }

  private applyFormErrors(errors: Record<string, string>) {
    const state = formIssueState(this.form, errors);
    this.fieldErrors = state.fieldErrors;
    this.issues = state.issues;
  }

  fieldChanged(key: ReportFieldKey) {
    if (this.callout?.flagged.includes(key) && !this.clearedFlags.has(key)) {
      this.clearedFlags = new SvelteSet([...this.clearedFlags, key]);
    }
    if (this.fieldErrors[key] || this.issues.length > 0) {
      const next = { ...this.fieldErrors };
      delete next[key];
      this.fieldErrors = next;
      this.issues = [];
    }
  }

  private async restoreLocal(serverDetail: ReportDetail) {
    const stored = await this.mirror.read(serverDetail.form);
    if (!stored) return;

    this.form = formFromDraft(stored.form);
    this.baseVersion = stored.version;
    this.saveKind = 'local';
    this.localSavedAt = stored.updatedAt;
  }

  async load() {
    this.view = 'loading';
    this.alert = null;
    this.serverError = null;
    this.issues = [];
    this.fieldErrors = {};

    const gate = await ensureActiveSession();
    if (gate !== 'ok') {
      if (gate === 'error') {
        this.requestId = undefined;
        this.view = 'error';
      }
      return;
    }

    try {
      const { detail, references } = await fetchReportBundle(this.id);

      this.detail = detail;
      this.references = references;
      this.savedForm = detail.form;
      this.form = formFromDraft(detail.form);
      this.attachments = detail.attachments
        .filter((attachment) => attachment.status !== 'DELETED')
        .map((attachment) => itemFromAttachment(attachment));
      this.baseVersion = detail.version;
      this.clearedFlags = new SvelteSet();
      this.saveKind = 'saved';
      this.saveAt = detail.updatedAt;

      await this.restoreLocal(detail);
      this.view = 'ready';
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        this.view = (await this.hasLocalDraft()) ? 'local' : 'not-found';
        return;
      }
      this.requestId = error instanceof ApiError ? error.requestId : undefined;
      this.view = 'error';
    }
  }

  /** A device-only draft has no server copy, so the API cannot answer for it. */
  private async hasLocalDraft(): Promise<boolean> {
    const owner = session.user?.id;
    if (!owner) return false;

    try {
      const platform = await createPlatform();
      const draft = await platform.drafts.get(this.id);
      return draft?.ownerUserId === owner;
    } catch {
      return false;
    }
  }

  async saveLocal() {
    if (!this.dirty || this.busy) return;

    this.saveKind = 'saving';
    const draft = await this.mirror.write({
      serverId: this.id,
      version: this.baseVersion,
      form: this.form,
    });

    if (draft) {
      this.localSavedAt = draft.updatedAt;
      this.saveKind = 'local';
    } else {
      this.saveKind = 'failed';
    }
  }

  private async persist(): Promise<number | null> {
    if (!this.detail) return null;
    const input = toReportFormInput(this.form);
    if (!input) return null;

    const head = await saveReport(this.id, input, this.baseVersion);
    const at = head.updatedAt ?? new SvelteDate().toISOString();

    this.detail = {
      ...this.detail,
      version: head.version,
      status: head.status,
      updatedAt: at,
      form: input,
    };
    this.savedForm = input;
    this.baseVersion = head.version;
    this.saveAt = at;
    this.localSavedAt = undefined;
    this.saveKind = 'saved';
    this.clearedFlags = new SvelteSet();
    this.fieldErrors = {};

    await this.mirror.clear();
    return head.version;
  }

  /** Replaces the page with the server copy; the author chose it explicitly. */
  private async applyServerCopy(server: ReportDetail) {
    this.detail = server;
    this.savedForm = server.form;
    this.form = formFromDraft(server.form);
    this.attachments = server.attachments
      .filter((attachment) => attachment.status !== 'DELETED')
      .map((attachment) => itemFromAttachment(attachment));
    this.baseVersion = server.version;
    this.clearedFlags = new SvelteSet();
    this.fieldErrors = {};
    this.issues = [];
    this.serverError = null;
    this.saveKind = 'saved';
    this.saveAt = server.updatedAt;
    this.localSavedAt = undefined;

    await this.mirror.clear();
  }

  async saveChanges(): Promise<boolean> {
    if (this.busy) return false;

    const errors = collectFormErrors(this.form);
    if (Object.keys(errors).length > 0) {
      this.applyFormErrors(errors);
      this.serverError = null;
      return false;
    }

    this.busy = 'saving';
    this.alert = null;
    this.serverError = null;
    this.saveKind = 'saving';

    try {
      await this.persist();
      this.issues = [];
      toast.success('Changes saved');
      return true;
    } catch (error) {
      this.saveKind = 'failed';
      if (error instanceof ApiError && error.status === 409) {
        await this.conflicts.open();
      } else if (error instanceof ApiError && error.status === 401) {
        clearSession();
        await goto('/login', { replaceState: true });
      } else {
        this.alert = 'We could not save your changes. The form still holds them. Try again.';
      }
      return false;
    } finally {
      this.busy = null;
    }
  }

  async resubmit(): Promise<boolean> {
    if (this.busy || this.access !== 'editable' || this.blockReason) return false;

    const errors = collectFormErrors(this.form);
    if (Object.keys(errors).length > 0) {
      this.applyFormErrors(errors);
      this.serverError = null;
      return false;
    }

    if (!toReportFormInput(this.form)) return false;

    this.busy = 'resubmitting';
    this.alert = null;
    this.serverError = null;
    this.issues = [];

    try {
      let version = this.baseVersion;
      if (this.dirty) version = (await this.persist()) ?? version;

      const validation = await validateReport(this.id);
      if (!validation.valid) {
        const state = serverIssueState(this.form, validation.issues);
        this.fieldErrors = state.fieldErrors;
        this.issues = state.issues;
        this.serverError = 'The report could not be resubmitted. Correct the fields listed above.';
        return false;
      }

      await resubmitReport(this.id, resubmitKey(), version);
      await this.mirror.clear();
      toast.success('Report resubmitted');
      await goto(`/reports/${this.id}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await this.conflicts.open();
      } else if (error instanceof ApiError && error.status === 401) {
        clearSession();
        await goto('/login', { replaceState: true });
      } else {
        this.serverError =
          error instanceof ApiError
            ? `The report was not resubmitted. ${error.message}`
            : 'The report was not resubmitted. Check your connection and try again.';
      }
      return false;
    } finally {
      this.busy = null;
    }
  }

  async discardChanges() {
    if (!this.savedForm) return;

    this.form = formFromDraft(this.savedForm);
    this.baseVersion = this.detail?.version ?? this.baseVersion;
    this.clearedFlags = new SvelteSet();
    this.fieldErrors = {};
    this.issues = [];
    this.alert = null;
    this.serverError = null;
    this.saveKind = 'saved';
    this.saveAt = this.detail?.updatedAt;
    this.localSavedAt = undefined;

    await this.mirror.clear();
  }

  async clearLocalDraft() {
    await this.mirror.clear();
  }
}

import type { ReportDetail, ReportFormInput } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import {
  itemFromAttachment,
  type AttachmentItem,
} from '$lib/features/attachments/application/attachment-items';
import type { Platform } from '$lib/platform/contracts';

import {
  INITIAL_SAVE_STATE,
  buildDraft,
  newDraftId,
  type SaveState,
} from './wizard-draft';
import {
  formFromDraft,
  stepFromDraft,
  stepFromParams,
  type WizardForm,
  type WizardStep,
} from './wizard-form';

/**
 * The wizard's draft file (UI phase 06 §4): the local draft in the platform
 * store, the server draft created at the first upload, and the save state the
 * header shows. Local-first and silent — a failure is a text action, not a modal.
 */

export type DraftSnapshot = { step: WizardStep; form: WizardForm };

export type RestoredDraft = {
  step: WizardStep;
  form: WizardForm;
  attachments: AttachmentItem[];
};

export class WizardDraftFile {
  id = $state('');
  serverId = $state<string | null>(null);
  version = $state(1);
  state = $state<SaveState>(INITIAL_SAVE_STATE);
  dirty = $state(false);
  restored = $state(false);
  restoredAt = $state<string | null>(null);
  /** Set when the server copy moved on or disappeared under a restored draft. */
  issue = $state<'missing' | 'returned' | null>(null);

  constructor(id: string) {
    this.id = id;
  }

  async save(platform: Platform | null, snapshot: DraftSnapshot): Promise<boolean> {
    if (!platform) return false;
    this.state = { ...this.state, status: 'saving' };

    try {
      const draft = buildDraft({
        id: this.id,
        ...(this.serverId ? { serverId: this.serverId } : {}),
        version: this.version,
        step: snapshot.step,
        form: snapshot.form,
      });
      await platform.drafts.put(draft);
      this.state = { status: 'saved', savedAt: draft.updatedAt };
      this.dirty = false;
      return true;
    } catch {
      this.state = { ...this.state, status: 'error' };
      return false;
    }
  }

  /** Creates the server draft on the first persist; the id never changes after. */
  async ensureServer(
    platform: Platform | null,
    snapshot: DraftSnapshot,
    input: ReportFormInput,
  ): Promise<string> {
    if (this.serverId) return this.serverId;

    const created = await api.reports.create(input);
    this.serverId = created.id;
    this.version = created.version;

    if (platform) {
      await platform.drafts.put(
        buildDraft({
          id: this.id,
          serverId: created.id,
          version: created.version,
          step: snapshot.step,
          form: snapshot.form,
        }),
      );
    }

    return created.id;
  }

  /**
   * Adopt a server draft the route already loaded (spec §7.4), so the wizard
   * continues that report instead of creating a second one.
   */
  adopt(detail: ReportDetail): { form: WizardForm; attachments: AttachmentItem[] } {
    this.serverId = detail.id;
    this.version = detail.version;
    this.state = { status: 'saved', savedAt: detail.updatedAt };
    this.restored = true;
    this.restoredAt = detail.updatedAt;

    return {
      form: formFromDraft(detail.form),
      attachments: detail.attachments
        .filter((attachment) => attachment.status !== 'DELETED')
        .map((attachment) => itemFromAttachment(attachment)),
    };
  }

  async restore(
    platform: Platform | null,
    requested: string,
    search: URLSearchParams,
  ): Promise<RestoredDraft | null> {
    if (!requested || !platform) return null;

    const draft = await platform.drafts.get(requested);
    if (!draft) return null;

    this.id = draft.id;
    this.serverId = draft.serverId ?? null;
    this.version = draft.version;
    this.state = { status: 'saved', savedAt: draft.updatedAt };
    this.restored = true;
    this.restoredAt = draft.updatedAt;

    return {
      step: search.has('step') ? stepFromParams(search) : stepFromDraft(draft.step),
      form: formFromDraft(draft.form),
      attachments: await this.serverAttachments(draft.serverId),
    };
  }

  async remove(platform: Platform | null): Promise<void> {
    await platform?.drafts.remove(this.id);
  }

  /** Keep the restored local text as a new report; never overwrite the server copy. */
  detach(): void {
    this.issue = null;
    this.serverId = null;
    this.dirty = true;
  }

  /** Start over: a fresh local draft id and no server link. */
  reset(): void {
    this.issue = null;
    this.id = newDraftId();
    this.serverId = null;
    this.version = 1;
    this.state = INITIAL_SAVE_STATE;
    this.restored = false;
    this.restoredAt = null;
    this.dirty = false;
  }

  private async serverAttachments(serverId: string | undefined): Promise<AttachmentItem[]> {
    if (!serverId) return [];

    try {
      const detail = await api.reports.get(serverId);
      if (detail.status !== 'DRAFT') this.issue = 'returned';

      return detail.attachments
        .filter((attachment) => attachment.status !== 'DELETED')
        .map((attachment) => itemFromAttachment(attachment));
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        this.issue = 'missing';
      }
      return [];
    }
  }
}

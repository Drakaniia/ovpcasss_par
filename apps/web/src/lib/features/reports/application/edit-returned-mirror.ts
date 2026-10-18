import type { ReportDraftForm, ReportFormInput } from '@par/shared';

import { createPlatform } from '$lib/platform';
import type { Platform } from '$lib/platform/contracts';

import { draftFormFromWizard, type WizardForm } from './wizard-form';
import { FIELD_ORDER, fieldValuesEqual } from './report-field-values';

/**
 * The device-local mirror of a returned report (UI phase 07 §3). Autosave is
 * local-first and silent: the server copy is written only when the author saves
 * or resubmits, so an accidental navigation never loses a correction.
 */

export type LocalDraft = {
  form: ReportDraftForm;
  version: number;
  updatedAt: string;
};

export class LocalMirror {
  private readonly draftId: string;
  private platform: Promise<Platform> | null = null;

  constructor(draftId: string) {
    this.draftId = draftId;
  }

  private async open(): Promise<Platform | null> {
    try {
      this.platform ??= createPlatform();
      return await this.platform;
    } catch {
      this.platform = null;
      return null;
    }
  }

  /** The stored copy, but only while it still differs from the server's. */
  async read(serverForm: ReportFormInput): Promise<LocalDraft | null> {
    const platform = await this.open();
    if (!platform) return null;

    const stored = await platform.drafts.get(this.draftId);
    if (!stored) return null;

    const differs = FIELD_ORDER.some(
      (key) => !fieldValuesEqual(key, stored.form, serverForm),
    );
    if (!differs) {
      await platform.drafts.remove(this.draftId).catch(() => {});
      return null;
    }

    return { form: stored.form, version: stored.version, updatedAt: stored.updatedAt };
  }

  /** Writes the current values; false means the device store refused. */
  async write(options: {
    serverId: string;
    version: number;
    form: WizardForm;
  }): Promise<LocalDraft | null> {
    const platform = await this.open();
    if (!platform) return null;

    const draft: LocalDraft = {
      form: draftFormFromWizard(options.form),
      version: options.version,
      updatedAt: new Date().toISOString(),
    };

    try {
      await platform.drafts.put({
        id: this.draftId,
        serverId: options.serverId,
        version: draft.version,
        updatedAt: draft.updatedAt,
        form: draft.form,
      });
      return draft;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    const platform = await this.open();
    await platform?.drafts.remove(this.draftId).catch(() => {});
  }
}

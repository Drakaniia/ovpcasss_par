import type { ReportDetail } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';

import {
  conflictFields,
  localEditsText,
  serverVersionLine,
  type ConflictField,
} from './report-conflict';
import type { EditReferences } from './report-field-values';
import type { WizardForm } from './wizard-form';

/**
 * 409 on submit (UI phase 06 §7, phase 07 dialog). The newer server copy is
 * loaded and compared; nothing is merged and nothing is discarded without an
 * explicit choice.
 */
export class WizardConflict {
  open = $state(false);
  loading = $state(false);
  error = $state<string | undefined>();
  fields = $state<ConflictField[]>([]);
  serverLine = $state<string | undefined>();
  server = $state<ReportDetail | null>(null);

  async load(
    reportId: string,
    form: WizardForm,
    references: EditReferences,
  ): Promise<void> {
    this.open = true;
    this.loading = true;
    this.error = undefined;
    this.fields = [];
    this.serverLine = undefined;
    this.server = null;

    try {
      const detail = await api.reports.get(reportId);
      this.server = detail;
      this.fields = conflictFields(detail.form, form, references);
      this.serverLine = serverVersionLine(detail);
    } catch (error) {
      this.error =
        error instanceof ApiError
          ? error.message
          : 'The server version could not be loaded. Try again.';
    } finally {
      this.loading = false;
    }
  }

  close(): void {
    this.open = false;
  }

  /** The author chose the server copy: hand it back and close the dialog. */
  takeServerCopy(): ReportDetail | null {
    const server = this.server;
    this.close();
    return server;
  }

  async copy(form: WizardForm): Promise<void> {
    const title = form.title.trim() || 'this report';
    await navigator.clipboard.writeText(localEditsText(this.fields, title));
  }
}

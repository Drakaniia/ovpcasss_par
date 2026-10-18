import type { ReportDetail } from '@par/shared';

import { toast } from '$lib/toast/toast.svelte';

import { fetchServerCopy } from './edit-returned-requests';
import {
  conflictFields,
  localEditsText,
  serverVersionLine,
  type ConflictField,
} from './report-conflict';
import type { EditReferences } from './report-field-values';
import type { WizardForm } from './wizard-form';

/**
 * The 409 conflict for a returned report (UI phase 07 §4). It never merges and
 * never discards on its own: the page keeps its local copy until the author
 * chooses the server version, and the dialog can be dismissed with the edits
 * intact.
 */

export type ConflictState = {
  loading: boolean;
  error?: string;
  server: ReportDetail | null;
  fields: ConflictField[];
};

export type ConflictOptions = {
  reportId: string;
  form: () => WizardForm;
  references: () => EditReferences;
  title: () => string;
  /** Called with the server copy once the author confirms the switch. */
  applyServer: (server: ReportDetail) => Promise<void>;
};

export class ConflictController {
  conflict = $state<ConflictState | null>(null);

  private readonly options: ConflictOptions;

  constructor(options: ConflictOptions) {
    this.options = options;
  }

  get line(): string | undefined {
    return this.conflict?.server ? serverVersionLine(this.conflict.server) : undefined;
  }

  close() {
    this.conflict = null;
  }

  async open() {
    this.conflict = { loading: true, server: null, fields: [] };

    try {
      const server = await fetchServerCopy(this.options.reportId);
      this.conflict = {
        loading: false,
        server,
        fields: conflictFields(server.form, this.options.form(), this.options.references()),
      };
    } catch {
      this.conflict = {
        loading: false,
        server: null,
        fields: [],
        error: 'The server version could not be loaded. Your edits are unchanged.',
      };
    }
  }

  async useServerVersion() {
    const server = this.conflict?.server;
    if (!server) return;

    this.conflict = null;
    await this.options.applyServer(server);
  }

  async copyEdits() {
    try {
      await navigator.clipboard.writeText(
        localEditsText(this.conflict?.fields ?? [], this.options.title()),
      );
      toast.success('Your edits were copied.');
    } catch {
      toast.error('We could not copy your edits. Try again.');
    }
  }
}

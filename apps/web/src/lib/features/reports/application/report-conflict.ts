import type { ReportDetail, ReportFormInput } from '@par/shared';

import { formatDateTime } from '$lib/format/datetime';

import {
  displayFieldValue,
  FIELD_LABELS,
  FIELD_ORDER,
  fieldValuesEqual,
  type EditReferences,
  type ReportFieldKey,
} from './report-field-values';
import { draftFormFromWizard, type WizardForm } from './wizard-form';

/**
 * 409 handling (UI spec §7.6, §8.6). The dialog shows only the fields that
 * differ, always side by side. Nothing is merged and nothing is discarded
 * without an explicit choice, so both copies stay intact while it is open.
 */

export type ConflictField = {
  key: ReportFieldKey;
  label: string;
  serverValue: string;
  localValue: string;
};

export function conflictFields(
  serverForm: ReportFormInput,
  localForm: WizardForm,
  references: EditReferences,
): ConflictField[] {
  const local = draftFormFromWizard(localForm);

  return FIELD_ORDER.filter((key) => !fieldValuesEqual(key, serverForm, local)).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    serverValue: displayFieldValue(key, serverForm, references),
    localValue: displayFieldValue(key, local, references),
  }));
}

/** The single 409 title (UI spec §7.6): a stale report during editing. */
export function conflictTitle(): string {
  return 'This report changed while you were editing';
}

/** Stable description of who holds the newer copy, when the API supplies it. */
export function serverVersionLine(server: ReportDetail): string {
  const when = `updated ${formatDateTime(server.updatedAt)}`;
  return server.updatedByName
    ? `Server version ${server.version}, ${when} by ${server.updatedByName}.`
    : `Server version ${server.version}, ${when}.`;
}

/** Clipboard text for "Copy my edits": one labelled block per changed field. */
export function localEditsText(fields: readonly ConflictField[], title: string): string {
  const header = `Your edits to "${title}"`;
  const blocks = fields.map((field) => `${field.label}:\n${field.localValue}`);
  return [header, ...blocks].join('\n\n');
}

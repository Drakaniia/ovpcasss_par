import type { ReportFormInput } from '../contracts/reports';

export interface ValidationIssue {
  field: keyof ReportFormInput | 'attachments';
  message: string;
}

/**
 * Returns completeness problems so the UI can render a checklist (spec §7.6).
 * Required-attachment rules per activity type are added in M3.
 */
export function validateReport(
  _form: ReportFormInput,
  _confirmedAttachments = 0,
): ValidationIssue[] {
  return [];
}

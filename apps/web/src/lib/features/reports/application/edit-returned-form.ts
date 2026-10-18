import type { ReportValidationIssue } from '@par/shared';

import type { IssueSummaryItem } from './edit-returned';
import { issueSummary } from './edit-returned';
import { fieldKeyFromId } from './report-field-values';
import { WIZARD_STEPS, type WizardForm } from './wizard-form';
import { errorSummary, fieldDomId, validateStep } from './wizard-validation';

/**
 * The edit page is one page, so validation is the union of all four wizard
 * steps rather than "current step only" (UI spec §7.6, §8.4).
 */
export function collectFormErrors(form: WizardForm): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const step of WIZARD_STEPS) {
    for (const [key, message] of Object.entries(validateStep(step, form))) {
      if (!errors[key]) errors[key] = message;
    }
  }
  return errors;
}

export type FormIssueState = {
  fieldErrors: Record<string, string>;
  issues: IssueSummaryItem[];
};

export function formIssueState(form: WizardForm, errors: Record<string, string>): FormIssueState {
  return {
    fieldErrors: errors,
    issues: errorSummary(form, errors).map((issue) => ({
      field: issue.field,
      label: issue.label,
      message: issue.message,
      targetId: fieldDomId(issue.field),
    })),
  };
}

/** Maps the server's field ids back onto the rendered fields, never guessing. */
export function serverIssueState(
  form: WizardForm,
  issues: readonly ReportValidationIssue[],
): FormIssueState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = fieldKeyFromId(issue.field);
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return { fieldErrors, issues: issueSummary(issues, form) };
}

import type { AttachmentRequirement, ReportType } from '@par/shared';

import type { WizardForm, WizardStep } from './wizard-form';

/**
 * Completeness checklist (UI phase 06 §5). Items are fixed and ordered; the
 * attachment denominator comes from `ref_attachment_requirements` for the chosen
 * activity type. Incomplete items are informational until Submit.
 */

export type AttachmentUiStatus = 'UPLOADING' | 'PENDING' | 'CONFIRMED' | 'FAILED';

/** Structural so the checklist does not depend on the uploader's item type. */
export type CompletenessAttachment = { label: string; status: AttachmentUiStatus };

export type CompletenessItemId = 'type' | 'campus' | 'dates' | 'narrative' | 'attachments';

export type CompletenessItem = {
  id: CompletenessItemId;
  label: string;
  complete: boolean;
  step: WizardStep;
  /** Missing required attachment labels, shown as sub-lines. */
  missing?: string[];
};

export type RequirementProgress = {
  requirement: AttachmentRequirement;
  confirmed: number;
  required: number;
  satisfied: boolean;
};

export type AttachmentCompleteness = {
  confirmedTotal: number;
  requiredTotal: number;
  progress: RequirementProgress[];
  missingLabels: string[];
  complete: boolean;
};

/** Active requirements for the type; a blank type has none. */
export function activeRequirements(
  requirements: readonly AttachmentRequirement[],
  type: ReportType | '',
): AttachmentRequirement[] {
  if (!type) return [];
  return requirements
    .filter((requirement) => requirement.isActive && requirement.activityType === type)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function requirementProgress(
  requirements: readonly AttachmentRequirement[],
  attachments: readonly CompletenessAttachment[],
  type: ReportType | '',
): AttachmentCompleteness {
  const progress = activeRequirements(requirements, type).map((requirement) => {
    const confirmed = attachments.filter(
      (attachment) => attachment.label === requirement.label && attachment.status === 'CONFIRMED',
    ).length;
    const required = requirement.isRequired ? requirement.minCount : 0;

    return { requirement, confirmed, required, satisfied: confirmed >= required };
  });

  const requiredProgress = progress.filter(
    (entry) => entry.requirement.isRequired && entry.required > 0,
  );
  const confirmedTotal = requiredProgress.reduce(
    (sum, entry) => sum + Math.min(entry.confirmed, entry.required),
    0,
  );
  const requiredTotal = requiredProgress.reduce((sum, entry) => sum + entry.required, 0);
  const missingLabels = requiredProgress
    .filter((entry) => !entry.satisfied)
    .map((entry) => entry.requirement.label);
  const allConfirmed = attachments.every((attachment) => attachment.status === 'CONFIRMED');

  return {
    confirmedTotal,
    requiredTotal,
    progress,
    missingLabels,
    complete: missingLabels.length === 0 && allConfirmed,
  };
}

/** Distinct, sorted labels authors may pick in the uploader for this type. */
export function labelOptionsFor(
  requirements: readonly AttachmentRequirement[],
  type: ReportType | '',
): string[] {
  return [...new Set(activeRequirements(requirements, type).map((entry) => entry.label))];
}

/** The review summary's attachment line; the rail shows the label breakdown. */
export function attachmentCountLabel(count: number): string {
  if (count === 0) return '\u2014';
  return `${count} ${count === 1 ? 'file' : 'files'}`;
}

export function completenessItems(
  form: WizardForm,
  requirements: readonly AttachmentRequirement[],
  attachments: readonly CompletenessAttachment[],
): CompletenessItem[] {
  const attachmentInfo = requirementProgress(requirements, attachments, form.type);

  return [
    {
      id: 'type',
      label: 'Type and class',
      complete: Boolean(form.type && form.classification),
      step: 1,
    },
    {
      id: 'campus',
      label: 'Campus and college',
      complete: Boolean(form.campusId && form.unitId),
      step: 1,
    },
    {
      id: 'dates',
      label: 'Dates',
      complete: Boolean(form.startDate && form.endDate && form.endDate >= form.startDate),
      step: 2,
    },
    {
      id: 'narrative',
      label: 'Narrative',
      complete: form.narrative.trim() !== '',
      step: 4,
    },
    {
      id: 'attachments',
      label: `Attachments (${attachmentInfo.confirmedTotal}/${attachmentInfo.requiredTotal})`,
      complete: attachmentInfo.complete,
      step: 4,
      missing: attachmentInfo.missingLabels,
    },
  ];
}

export type CompletenessSummary = {
  complete: number;
  total: number;
  text: string;
  missing: CompletenessItem[];
};

export function completenessSummary(items: readonly CompletenessItem[]): CompletenessSummary {
  const done = items.filter((item) => item.complete).length;
  return {
    complete: done,
    total: items.length,
    text: `${done} of ${items.length} complete`,
    missing: items.filter((item) => !item.complete),
  };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** The reason next to Submit when an attachment is not Confirmed (§6). */
export function attachmentBlockReason(
  attachments: readonly CompletenessAttachment[],
): string | undefined {
  const uploading = attachments.filter(
    (attachment) => attachment.status === 'UPLOADING' || attachment.status === 'PENDING',
  );
  if (uploading.length > 0) {
    return `${uploading.length} ${plural(uploading.length, 'attachment is', 'attachments are')} still uploading. Submit is available once every attachment is Confirmed.`;
  }

  const failed = attachments.filter((attachment) => attachment.status === 'FAILED');
  if (failed.length > 0) {
    return `${failed.length} ${plural(failed.length, 'attachment has', 'attachments have')} not uploaded. Retry or remove them before submitting.`;
  }

  return undefined;
}

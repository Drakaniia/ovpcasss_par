import type { ReportDetail, ReportStatus, Role } from '@par/shared';

/**
 * Workflow presentation for the facsimile (UI spec §7.7, §8.2). The five
 * stages are a reading device, not a state: every stage maps back to one of the
 * seven API statuses and the UI never invents an intermediate state.
 */

export type StageKey = 'draft' | 'submitted' | 'review' | 'endorsed' | 'approved';

export type Stage = { key: StageKey; label: string };

export const STAGES: readonly Stage[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'Review' },
  { key: 'endorsed', label: 'Endorsed' },
  { key: 'approved', label: 'Approved' },
];

export type StageState = 'complete' | 'current' | 'upcoming';

/** The stage index the report has reached; earlier stages render complete. */
const CURRENT_STAGE: Record<ReportStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 2,
  RESUBMITTED: 2,
  RETURNED_BY_REVIEWER: 2,
  ENDORSED: 3,
  RETURNED_BY_APPROVER: 3,
  APPROVED: 4,
};

export type StageChip = {
  label: string;
  tone: 'danger' | 'info';
  /** Anchor into the document's review history. */
  href: string | null;
};

export type StepperState = {
  current: number;
  states: StageState[];
  chip: StageChip | null;
};

const RETURN_HREF = '#review-history';

export function stepperState(status: ReportStatus): StepperState {
  const current = CURRENT_STAGE[status];

  return {
    current,
    states: STAGES.map((_, index) =>
      index < current ? 'complete' : index === current ? 'current' : 'upcoming',
    ),
    chip: chipFor(status),
  };
}

function chipFor(status: ReportStatus): StageChip | null {
  switch (status) {
    case 'RETURNED_BY_REVIEWER':
    case 'RETURNED_BY_APPROVER':
      return { label: 'Returned', tone: 'danger', href: RETURN_HREF };
    case 'RESUBMITTED':
      return { label: 'Resubmitted', tone: 'info', href: null };
    default:
      return null;
  }
}

/**
 * Separation of duties (project spec §9): a submitter who also reviews or
 * approves cannot decide on their own report. Phase 08 has no decision controls
 * yet, so the reason is stated in the Actions slot instead of a dead button.
 */
export function separationNotice(input: {
  status: ReportStatus;
  ownerUserId: string;
  userId: string | null;
  role: Role | null;
}): string | null {
  if (!input.userId || input.ownerUserId !== input.userId) return null;

  if (input.role === 'REVIEWER' && (input.status === 'SUBMITTED' || input.status === 'RESUBMITTED')) {
    return 'You submitted this report. A reviewer cannot endorse a report they submitted.';
  }

  if (input.role === 'APPROVER' && input.status === 'ENDORSED') {
    return 'You submitted this report. An approver cannot approve a report they submitted.';
  }

  return null;
}

export type PdfWatermark = 'NONE' | 'DRAFT' | 'NOT_APPROVED';

export function pdfWatermark(status: ReportStatus): PdfWatermark {
  if (status === 'APPROVED') return 'NONE';
  if (status === 'DRAFT') return 'DRAFT';
  return 'NOT_APPROVED';
}

/** The adjacent label that says the download carries a watermark (§7.8). */
export function watermarkNote(status: ReportStatus): string | null {
  const watermark = pdfWatermark(status);
  if (watermark === 'NONE') return null;
  return watermark === 'DRAFT'
    ? 'The download carries a DRAFT watermark.'
    : 'The download carries a NOT APPROVED watermark.';
}

/**
 * An approved report without a recorded signature must not produce a blank
 * acknowledgement (phase 08 §6). The reason is shown inline, with the way out.
 */
export function acknowledgementIssue(detail: ReportDetail): string | null {
  if (detail.status !== 'APPROVED') return null;
  if (detail.approval?.signatureUrl) return null;

  return 'The approving officer’s signature is not on file, so the acknowledgement cannot be generated with a complete signature block. The approver can add a signature in Profile.';
}

import type { ReportStatus } from '@par/shared';

import { formatDate } from '$lib/format/datetime';

/**
 * Status presentation (UI spec §4.2, §8.2). The API enum maps 1:1; the UI never
 * invents a state or an intermediate label.
 */
export type StatusTone = 'neutral' | 'info' | 'danger' | 'gold' | 'success';

export type StatusIcon = 'pencil' | 'inbox' | 'send' | 'undo' | 'forward' | 'check';

export type StatusPresentation = {
  label: string;
  tone: StatusTone;
  icon: StatusIcon;
};

export const STATUS_PRESENTATION: Record<ReportStatus, StatusPresentation> = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: 'pencil' },
  SUBMITTED: { label: 'Submitted', tone: 'info', icon: 'inbox' },
  RESUBMITTED: { label: 'Resubmitted', tone: 'info', icon: 'send' },
  RETURNED_BY_REVIEWER: { label: 'Returned by reviewer', tone: 'danger', icon: 'undo' },
  RETURNED_BY_APPROVER: { label: 'Returned by approver', tone: 'danger', icon: 'undo' },
  ENDORSED: { label: 'Endorsed', tone: 'gold', icon: 'forward' },
  APPROVED: { label: 'Approved', tone: 'success', icon: 'check' },
};

const NEXT_STEP: Record<Exclude<ReportStatus, 'APPROVED'>, string> = {
  DRAFT: 'Not yet submitted · Next: complete the form and submit',
  SUBMITTED: 'With OVPCASSS reviewer · Next: review',
  RESUBMITTED: 'With OVPCASSS reviewer · Next: re-review',
  RETURNED_BY_REVIEWER: 'Returned to submitter · Next: revise and resubmit',
  ENDORSED: 'With approving officer · Next: approve',
  RETURNED_BY_APPROVER: 'Returned to submitter · Next: revise and resubmit',
};

export function nextStepText(status: ReportStatus, completedAt?: string): string {
  if (status === 'APPROVED') {
    return completedAt
      ? `Completed ${formatDate(completedAt)} · Acknowledgement available`
      : 'Completed · Acknowledgement available';
  }
  return NEXT_STEP[status];
}

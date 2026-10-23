import type { ReportStatus } from '@par/shared';

import { formatDate } from '$lib/format/datetime';

/**
 * Status presentation (UI spec §4.2, §8.2). The API enum maps 1:1; the UI never
 * invents a state or an intermediate label.
 */
export type StatusTone = 'neutral' | 'info' | 'danger' | 'success';

export type StatusIcon = 'pencil' | 'inbox' | 'undo' | 'check';

export type StatusPresentation = {
  label: string;
  tone: StatusTone;
  icon: StatusIcon;
};

export const STATUS_PRESENTATION: Record<ReportStatus, StatusPresentation> = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: 'pencil' },
  SUBMITTED: { label: 'Submitted', tone: 'info', icon: 'inbox' },
  RETURNED: { label: 'Returned', tone: 'danger', icon: 'undo' },
  APPROVED: { label: 'Approved', tone: 'success', icon: 'check' },
};

const NEXT_STEP: Record<Exclude<ReportStatus, 'APPROVED'>, string> = {
  DRAFT: 'With personnel in charge · Next: narrative report',
  SUBMITTED: 'With the office · Next: review and decision',
  RETURNED: 'With personnel in charge · Next: revise and resubmit',
};

export function nextStepText(status: ReportStatus, completedAt?: string): string {
  if (status === 'APPROVED') {
    return completedAt
      ? `Completed ${formatDate(completedAt)} · Acknowledgment receipt available`
      : 'Completed · Acknowledgment receipt available';
  }
  return NEXT_STEP[status];
}

import type { ReportStatus } from '../domain/enums';

/** Allowed status changes (spec §7.5). The API is the only caller that persists them. */
export const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['RETURNED_BY_REVIEWER', 'ENDORSED'],
  RETURNED_BY_REVIEWER: ['RESUBMITTED'],
  RESUBMITTED: ['RETURNED_BY_REVIEWER', 'ENDORSED'],
  ENDORSED: ['APPROVED', 'RETURNED_BY_APPROVER'],
  RETURNED_BY_APPROVER: ['RESUBMITTED'],
  APPROVED: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: ReportStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

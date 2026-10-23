import type { ReportStatus } from '../domain/enums';

/** Allowed status changes (spec §6). The API is the only caller that persists them. */
export const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['RETURNED', 'APPROVED'],
  RETURNED: ['SUBMITTED'],
  APPROVED: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: ReportStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** The statuses a write may start from when it moves a record to `to`. */
export function sourcesFor(to: ReportStatus): ReportStatus[] {
  return (Object.keys(ALLOWED_TRANSITIONS) as ReportStatus[]).filter((from) =>
    ALLOWED_TRANSITIONS[from].includes(to),
  );
}

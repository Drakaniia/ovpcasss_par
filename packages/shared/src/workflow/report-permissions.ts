import type { ReportStatus, Role } from '../domain/enums';

/** All ADMIN and PERSONNEL accounts belong to the shared OVPCASSS office. */
export function canAuthorReport(role: Role | null | undefined): boolean {
  return role === 'ADMIN' || role === 'PERSONNEL';
}

/** Content edits never transition status or invalidate an existing decision. */
export function canEditReport(role: Role | null | undefined, _status: ReportStatus): boolean {
  return canAuthorReport(role);
}

/** Submission is distinct from editing; one activity has one shared narrative. */
export function canSubmitReport(role: Role | null | undefined, status: ReportStatus): boolean {
  return canAuthorReport(role) && (status === 'PENDING' || status === 'RETURNED');
}

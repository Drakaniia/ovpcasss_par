import type { ReportStatus, Role } from '@par/shared';

/** The signed-in account and what the route knows about it. */
export interface Viewer {
  userId: string;
  role: Role | undefined;
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === 'ADMIN';
}

/**
 * The register is open to every signed-in account (spec §5): a PIC browses all
 * activities and claims one by writing its narrative, rather than waiting to be
 * named. A receipt is still only ever disclosed to its own recipient.
 */
export function canViewReport(_viewer: Viewer): boolean {
  return true;
}

/** The office owns the activity fields and the PIC list until approval. */
export function canManageRecord(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status !== 'APPROVED';
}

/**
 * Any PIC may write an open narrative; submitting claims the record for that
 * account (spec §5). The office stands in for every role (spec §9).
 */
export function canWriteNarrative(viewer: Viewer, status: ReportStatus): boolean {
  return (
    (viewer.role === 'PERSONNEL' || isAdmin(viewer)) &&
    (status === 'PENDING' || status === 'RETURNED')
  );
}

/** One office decision on a submitted narrative. */
export function canDecide(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'SUBMITTED';
}

/** Only an unsubmitted record can be removed, and only by the office. */
export function canDeleteRecord(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'PENDING';
}

/** Filing is a separate action on an approved record, never a transition. */
export function canArchive(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'APPROVED';
}

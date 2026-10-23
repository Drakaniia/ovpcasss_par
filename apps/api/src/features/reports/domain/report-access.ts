import type { ReportStatus, Role } from '@par/shared';

/** The signed-in account and what the route knows about it. */
export interface Viewer {
  userId: string;
  role: Role | undefined;
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === 'ADMIN';
}

/** A record is visible to the office and to its listed personnel in charge. */
export function canViewReport(viewer: Viewer, isPic: boolean): boolean {
  return isAdmin(viewer) || isPic;
}

/** The office owns the activity fields and the PIC list until approval. */
export function canManageRecord(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status !== 'APPROVED';
}

/** The narrative belongs to the PICs, and only while it is theirs to submit. */
export function canWriteNarrative(viewer: Viewer, isPic: boolean, status: ReportStatus): boolean {
  return isPic && (status === 'DRAFT' || status === 'RETURNED');
}

/** One office decision on a submitted narrative. */
export function canDecide(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'SUBMITTED';
}

/** Only an unsubmitted record can be removed, and only by the office. */
export function canDeleteRecord(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'DRAFT';
}

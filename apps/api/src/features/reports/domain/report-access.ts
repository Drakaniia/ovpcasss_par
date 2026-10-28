import type { ReportStatus, Role } from '@par/shared';

/** The signed-in account and what the route knows about it. */
export interface Viewer {
  userId: string;
  role: Role | undefined;
}

/** The report columns the privacy rules read. */
export interface NarrativeRecord {
  status: ReportStatus;
  /** The PIC whose submission claimed the narrative; null before submission. */
  submittedByUserId: string | null;
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === 'ADMIN';
}

/**
 * The narrative and its attachments belong to the submitter and the office.
 * Before submission the draft stays open — any PIC may pick it up, and the
 * office still does not read it — but once it is submitted, another PIC named
 * on the record no longer reads the words or the files.
 */
export function canReadNarrative(
  viewer: Viewer,
  row: NarrativeRecord,
  isPic: boolean,
): boolean {
  if (row.status === 'PENDING') return !isAdmin(viewer) || isPic;
  return isAdmin(viewer) || row.submittedByUserId === viewer.userId;
}

/**
 * The facsimile carries the submitted narrative, so it follows the narrative:
 * the office reads every copy (watermarked before approval, spec §7.8), and a
 * PIC reads the copy of the narrative they submitted, never another's.
 */
export function canViewFacsimile(
  viewer: Viewer,
  row: NarrativeRecord,
  isPic: boolean,
): boolean {
  if (isAdmin(viewer)) return true;
  return isPic && row.status !== 'PENDING' && row.submittedByUserId === viewer.userId;
}

/** The office owns the activity fields and the PIC list until approval. */
export function canManageRecord(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status !== 'APPROVED';
}

/**
 * Any PIC may write an open narrative; submitting claims the record for that
 * account (spec §5). A returned narrative stays with the PIC who submitted it,
 * so another PIC cannot edit or resubmit words that are private to them. The
 * office stands in for every role (spec §9).
 */
export function canWriteNarrative(viewer: Viewer, row: NarrativeRecord): boolean {
  if (viewer.role !== 'PERSONNEL' && !isAdmin(viewer)) return false;
  if (row.status === 'PENDING') return true;
  if (row.status !== 'RETURNED') return false;
  return (
    isAdmin(viewer) || row.submittedByUserId === null || row.submittedByUserId === viewer.userId
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

/**
 * Filing may end in removal (2026-10-27): an approved record the office has
 * archived can be deleted. An approved record that is still in the register is
 * refused, so archiving stays the deliberate step before a permanent delete.
 */
export function canDeleteArchivedRecord(
  viewer: Viewer,
  record: { status: ReportStatus; archivedAt: string | null },
): boolean {
  return isAdmin(viewer) && record.status === 'APPROVED' && record.archivedAt !== null;
}

/** Filing is a separate action on an approved record, never a transition. */
export function canArchive(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'APPROVED';
}

/**
 * The office records the completion date on an approved record. It is not an
 * activity edit, so it is allowed after `canManageRecord` has closed: the sheet
 * date and the decision timestamp are separate facts.
 */
export function canSetCompletedDate(viewer: Viewer, status: ReportStatus): boolean {
  return isAdmin(viewer) && status === 'APPROVED';
}

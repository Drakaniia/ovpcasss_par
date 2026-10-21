import { actsAs, type ReportStatus, type Role } from '@par/shared';

/**
 * Who may read or edit a report (spec §9): a Submitter only ever sees their own;
 * Reviewers, Approvers, and Admins read everything. Editing is the owner's, and
 * only while the report is a draft or was returned. Admin also acts as a
 * Submitter, so a report it filed is editable by it — and by nobody else.
 */
export interface Viewer {
  userId: string;
  role: Role | undefined;
}

export function canViewReport(viewer: Viewer, ownerUserId: string): boolean {
  if (viewer.role === 'SUBMITTER') return viewer.userId === ownerUserId;
  return viewer.userId === ownerUserId || viewer.role !== undefined;
}

export function canEditReport(viewer: Viewer, ownerUserId: string, status: ReportStatus): boolean {
  if (!actsAs(viewer.role, 'SUBMITTER') || viewer.userId !== ownerUserId) return false;
  return (
    status === 'DRAFT' || status === 'RETURNED_BY_REVIEWER' || status === 'RETURNED_BY_APPROVER'
  );
}

/**
 * The owner filter a report search must apply. It is the same rule as
 * `canViewReport`, expressed as a query condition: a Submitter searches only
 * their own reports, everyone else searches every report (spec §9).
 */
export function reportSearchScope(viewer: Viewer): { ownerUserId?: string } {
  return viewer.role === 'SUBMITTER' ? { ownerUserId: viewer.userId } : {};
}

/** A decision is never allowed on the submitter's own report (spec §9). */
export function canDecide(viewer: Viewer, ownerUserId: string): boolean {
  return viewer.userId !== ownerUserId;
}

/** True for the role that owns the next transition. */
export function hasRole(role: Role | undefined, expected: Role): boolean {
  return role === expected;
}

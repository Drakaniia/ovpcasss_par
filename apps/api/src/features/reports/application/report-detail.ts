import type { AuditEventRow, AuditQueries, ReportReadQueries, UserQueries } from '@par/db';
import type {
  ReportCommentRound,
  ReportDetail,
  ReportHistoryEvent,
  ReportPerson,
  ReportStatus,
  Role,
} from '@par/shared';

import { toAttachment, toDetailForm } from './report-shape';

export interface ReportDetailDependencies {
  read: ReportReadQueries;
  users: UserQueries;
  audit: AuditQueries;
}

const HISTORY_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  RESUBMITTED: 'Resubmitted',
  ENDORSED: 'Endorsed',
  APPROVED: 'Approved',
  RETURNED_BY_REVIEWER: 'Returned by reviewer',
  RETURNED_BY_APPROVER: 'Returned by approver',
  ATTACHMENT_ADDED: 'Attachment added',
  ATTACHMENT_REMOVED: 'Attachment removed',
  EXPORTED: 'Exported',
  DRAFT_DELETED: 'Draft deleted',
};

/** The audit timeline's action copy; the UI never builds it from the code. */
export function historyActionLabel(action: string): string {
  return HISTORY_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase();
}

/**
 * Builds the one shape the facsimile, the edit-returned page, and the queue
 * preview read (spec §7.6-§7.7). Every fact comes from a stored row or the
 * append-only audit trail; nothing is inferred from the status alone.
 */
export async function buildReportDetail(
  deps: ReportDetailDependencies,
  reportId: string,
): Promise<ReportDetail | null> {
  const row = await deps.read.findById(reportId);
  if (!row) return null;

  const [pics, sdgIds, attachmentRows, comments, events] = await Promise.all([
    deps.read.listPics(reportId),
    deps.read.listSdgIds(reportId),
    deps.read.listAttachments(reportId),
    deps.read.listComments(reportId),
    deps.audit.listForEntity('report', reportId),
  ]);

  const names = await actorNames(deps.users, events, row.ownerUserId, row.approvedByUserId);
  const roles = new Map<string, Role>();
  for (const event of events) {
    if (event.actorUserId && event.actorRole) roles.set(event.actorUserId, event.actorRole);
  }

  const nameOf = (userId: string | null | undefined): string =>
    (userId ? names.get(userId) : undefined) ?? 'OVPCASSS';
  const roleOf = (userId: string | null | undefined): Role =>
    (userId ? roles.get(userId) : undefined) ?? 'SUBMITTER';

  const returns = comments.filter((comment) => comment.kind === 'RETURN');
  const latestReturn = returns.at(-1) ?? null;
  const submitter = person(row.ownerUserId, nameOf(row.ownerUserId), 'SUBMITTER', row.submittedAt);
  const reviewer = lastActor(events, 'REVIEWER', ['ENDORSED', 'RETURNED_BY_REVIEWER'], nameOf);
  const approver = lastActor(events, 'APPROVER', ['APPROVED', 'RETURNED_BY_APPROVER'], nameOf);

  const history: ReportHistoryEvent[] = events.map((event) => ({
    id: event.id,
    at: event.createdAt,
    actorName: nameOf(event.actorUserId),
    actorRole: event.actorRole ?? roleOf(event.actorUserId),
    action: historyActionLabel(event.action),
    fromStatus: event.fromStatus as ReportStatus | null,
    toStatus: event.toStatus as ReportStatus | null,
    ...(event.comment ? { comment: event.comment } : {}),
  }));

  const commentRounds: ReportCommentRound[] = returns.map((comment) => ({
    round: comment.round,
    authorName: comment.authorName,
    authorRole: comment.authorRole ?? 'REVIEWER',
    createdAt: comment.createdAt,
    comments: comment.body,
  }));

  const lastEvent = events.at(-1) ?? null;

  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    trackingNumber: row.trackingNumber,
    status: row.status,
    version: row.version,
    updatedAt: row.updatedAt,
    form: toDetailForm(row, pics, sdgIds),
    attachments: attachmentRows.map(toAttachment),
    returnEvent: latestReturn
      ? {
          round: latestReturn.round,
          comments: latestReturn.body,
          authorName: latestReturn.authorName,
          authorRole: latestReturn.authorRole ?? 'REVIEWER',
          createdAt: latestReturn.createdAt,
        }
      : null,
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
    ...(latestReturn ? { returnedAt: latestReturn.createdAt } : {}),
    ...(row.approvedAt ? { completedAt: row.approvedAt } : {}),
    people: {
      submitter,
      ...(reviewer ? { reviewer } : {}),
      ...(approver ? { approver } : {}),
    },
    history,
    commentRounds,
    approval:
      row.approvedAt && row.approvedByUserId
        ? { signerName: nameOf(row.approvedByUserId), signedAt: row.approvedAt }
        : null,
    ...(lastEvent ? { updatedByName: nameOf(lastEvent.actorUserId) } : {}),
  };
}

function person(
  userId: string,
  fullName: string,
  role: Role,
  actedAt: string | null,
): ReportPerson {
  return {
    userId,
    fullName,
    role,
    ...(actedAt ? { actedAt } : {}),
  };
}

function lastActor(
  events: readonly AuditEventRow[],
  role: Role,
  actions: readonly string[],
  nameOf: (id: string | null) => string,
): ReportPerson | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event || event.actorRole !== role || !actions.includes(event.action)) continue;

    return {
      ...(event.actorUserId ? { userId: event.actorUserId } : {}),
      fullName: nameOf(event.actorUserId),
      role,
      actedAt: event.createdAt,
    };
  }

  return null;
}

async function actorNames(
  users: UserQueries,
  events: readonly AuditEventRow[],
  ownerUserId: string,
  approvedByUserId: string | null,
): Promise<Map<string, string>> {
  const ids = new Set<string>([ownerUserId]);
  if (approvedByUserId) ids.add(approvedByUserId);
  for (const event of events) {
    if (event.actorUserId) ids.add(event.actorUserId);
  }

  const names = new Map<string, string>();
  await Promise.all(
    [...ids].map(async (id) => {
      const user = await users.findById(id);
      if (user) names.set(id, user.fullName);
    }),
  );

  return names;
}

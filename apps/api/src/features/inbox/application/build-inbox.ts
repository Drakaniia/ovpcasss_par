import {
  actsAs,
  type InboxActivity,
  type InboxAdmin,
  type InboxItem,
  type InboxResponse,
  type InboxSection,
  type Role,
} from '@par/shared';
import type {
  AuditQueries,
  EmailOutboxQueries,
  InboxEventRow,
  InboxQueries as InboxReadQueries,
  InboxReportRow,
  NotificationQueries,
  UserQueries,
  UserRow,
} from '@par/db';

import { summarizeAuditEvent } from '../domain/audit-summary';
import { isProfileComplete } from '../domain/onboarding';

/**
 * Work-inbox assembly (UI spec §7.3, signature spec §6.1). Every section is a
 * real indexed read that reports its true total; the client renders at most
 * three rows and never derives a count from them. Roles are filtered here, but
 * the client still renders the union in its fixed order.
 */
export interface InboxQueries {
  users: UserQueries;
  emailOutbox: EmailOutboxQueries;
  audit: AuditQueries;
  inbox: InboxReadQueries;
  notifications: NotificationQueries;
}

const ACTIVITY_KINDS = new Set<InboxActivity['kind']>([
  'SUBMITTED',
  'RESUBMITTED',
  'RETURNED_BY_REVIEWER',
  'RETURNED_BY_APPROVER',
  'ENDORSED',
  'APPROVED',
]);

export async function buildInbox(
  queries: InboxQueries,
  user: UserRow,
  role: Role | undefined,
): Promise<InboxResponse> {
  const submitter = actsAs(role, 'SUBMITTER');
  const reviewer = actsAs(role, 'REVIEWER');
  const approver = actsAs(role, 'APPROVER');

  const [
    returned,
    review,
    approval,
    drafts,
    waiting,
    activity,
    decided,
    unread,
    submitted,
    draftId,
  ] = await Promise.all([
    submitter ? queries.inbox.returned(user.id) : emptyPage(),
    reviewer ? queries.inbox.review() : emptyPage(),
    approver ? queries.inbox.approval() : emptyPage(),
    submitter ? queries.inbox.drafts(user.id) : emptyPage(),
    submitter ? queries.inbox.waiting(user.id) : emptyPage(),
    submitter ? queries.inbox.activity(user.id) : [],
    queries.inbox.recentlyDecided(user.id),
    queries.notifications.countUnread(user.id),
    queries.inbox.hasSubmitted(user.id),
    queries.inbox.firstDraftId(user.id),
  ]);

  return {
    returned: sectionFor(returned, user.id, false),
    review: sectionFor(review, user.id, false),
    approval: sectionFor(approval, user.id, false),
    drafts: sectionFor(drafts, user.id, true),
    waiting: sectionFor(waiting, user.id, false),
    activity: activity.map(activityItem).filter((item) => ACTIVITY_KINDS.has(item.kind)),
    recentlyDecided: decided.map(activityItem).filter((item) => ACTIVITY_KINDS.has(item.kind)),
    notificationsUnread: unread,
    admin: role === 'ADMIN' ? await buildAdmin(queries) : null,
    onboarding: {
      profileComplete: isProfileComplete(user),
      hasSubmitted: submitted,
      draftId,
    },
  };
}

function emptyPage(): { total: number; rows: InboxReportRow[] } {
  return { total: 0, rows: [] };
}

/** `total` stays the server count; at most three rows travel with it. */
function sectionFor(
  page: { total: number; rows: InboxReportRow[] },
  viewerId: string,
  withCompleteness: boolean,
): InboxSection {
  return {
    total: page.total,
    items: page.rows.slice(0, 3).map((row) => inboxItem(row, viewerId, withCompleteness)),
  };
}

function inboxItem(row: InboxReportRow, viewerId: string, withCompleteness: boolean): InboxItem {
  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    title: row.title.trim() || 'Untitled draft',
    type: row.type,
    status: row.status,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    ...(withCompleteness ? { completeness: draftCompleteness(row) } : {}),
    isOwn: row.ownerUserId === viewerId,
  };
}

/**
 * Draft progress as the inbox table shows it: the share of the report's own
 * fields that carry a value. The wizard's checklist is finer — it also counts
 * required attachments — so this number is a quick sense of completeness, not
 * a promise that the draft is ready to submit.
 */
function draftCompleteness(row: InboxReportRow): number {
  const values = [
    row.title,
    row.campusId,
    row.unitId,
    row.activityStartDate,
    row.activityEndDate,
    row.location,
    row.narrative,
  ];

  return Math.round((values.filter((value) => value.trim() !== '').length / values.length) * 100);
}

function activityItem(row: InboxEventRow): InboxActivity {
  return {
    id: row.id,
    reportId: row.reportId,
    trackingNumber: row.trackingNumber,
    title: row.title,
    kind: row.action as InboxActivity['kind'],
    occurredAt: row.occurredAt,
  };
}

/** The admin block; an Admin also acts as a submitter, reviewer, and approver. */
async function buildAdmin(queries: InboxQueries): Promise<InboxAdmin> {
  const [failedEmails, recent] = await Promise.all([
    queries.emailOutbox.countFailed(),
    queries.audit.listRecent(3),
  ]);

  return {
    failedEmails,
    auditEvents: recent.map((row) => ({
      id: row.id,
      summary: summarizeAuditEvent(row),
      occurredAt: row.createdAt,
    })),
  };
}

import type {
  InboxActivity,
  InboxAdmin,
  InboxItem,
  InboxResponse,
  InboxSection,
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

/**
 * Work-inbox assembly (spec §12). Every section is a real indexed read that
 * reports its true total; the client renders at most three rows and never
 * derives a count from them.
 */
export interface InboxQueries {
  users: UserQueries;
  emailOutbox: EmailOutboxQueries;
  audit: AuditQueries;
  inbox: InboxReadQueries;
  notifications: NotificationQueries;
}

const ACTIVITY_KINDS: Record<string, InboxActivity['kind']> = {
  NARRATIVE_SUBMITTED: 'SUBMITTED',
  NARRATIVE_RETURNED: 'RETURNED',
  NARRATIVE_APPROVED: 'APPROVED',
};

export async function buildInbox(queries: InboxQueries, user: UserRow): Promise<InboxResponse> {
  const admin = user.role === 'ADMIN';

  const [awaitingReview, withPic, returned, approved, activity, decided, unread] =
    await Promise.all([
      admin ? queries.inbox.awaitingReview() : emptyPage(),
      admin ? queries.inbox.withPic() : emptyPage(),
      queries.inbox.returned(user.id, 3, admin),
      queries.inbox.approved(user.id, 3, admin),
      queries.inbox.activity(user.id, 5, admin),
      admin ? queries.inbox.recentlyDecided(user.id) : Promise.resolve([]),
      queries.notifications.countUnread(user.id),
    ]);

  return {
    awaitingReview: sectionFor(awaitingReview),
    withPic: sectionFor(withPic),
    returned: sectionFor(returned),
    approved: sectionFor(approved),
    activity: activity.map(activityItem).filter((item): item is InboxActivity => item !== null),
    recentlyDecided: decided
      .map(activityItem)
      .filter((item): item is InboxActivity => item !== null),
    notificationsUnread: unread,
    admin: admin ? await buildAdmin(queries) : null,
  };
}

function emptyPage(): { total: number; rows: InboxReportRow[] } {
  return { total: 0, rows: [] };
}

function sectionFor(page: { total: number; rows: InboxReportRow[] }): InboxSection {
  return { total: page.total, items: page.rows.slice(0, 3).map(inboxItem) };
}

function inboxItem(row: InboxReportRow): InboxItem {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    title: row.title,
    type: row.type,
    status: row.status,
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    updatedAt: row.updatedAt,
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
  };
}

function activityItem(row: InboxEventRow): InboxActivity | null {
  const kind = ACTIVITY_KINDS[row.action];
  if (!kind) return null;

  return {
    id: row.id,
    reportId: row.reportId,
    referenceNo: row.referenceNo,
    title: row.title,
    kind,
    occurredAt: row.occurredAt,
  };
}

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

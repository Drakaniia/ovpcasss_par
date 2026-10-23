import type {
  InboxActivity,
  InboxActivityKind,
  InboxAdmin,
  InboxAuditEvent,
  InboxItem,
  InboxResponse,
  InboxSection,
  Role,
} from '@par/shared';

import { formatDateTime } from '$lib/format/datetime';
import { formatAge, formatRelativeTime } from '$lib/format/relative-time';
import { STATUS_PRESENTATION } from '$lib/status/report-status';

/**
 * Work-inbox composition (spec §12.1–§12.2). The server decides which sections
 * this account may have and how many rows each holds; the client keeps one fixed
 * order and omits every empty section rather than rendering a zero.
 */

export type InboxCapabilities = {
  admin: boolean;
  personnel: boolean;
};

export function capabilitiesFor(roles: readonly Role[]): InboxCapabilities {
  return {
    admin: roles.includes('ADMIN'),
    personnel: roles.includes('PERSONNEL'),
  };
}

export type InboxSectionId = 'awaitingReview' | 'withPic' | 'returned' | 'approved' | 'myReports';

export function inboxSectionsFor(roles: readonly Role[], inbox: InboxResponse): InboxSectionId[] {
  const caps = capabilitiesFor(roles);
  const sections: InboxSectionId[] = [];

  if (caps.admin && inbox.awaitingReview.total > 0) sections.push('awaitingReview');
  if (caps.admin && inbox.withPic.total > 0) sections.push('withPic');
  if (inbox.returned.total > 0) sections.push('returned');
  if (inbox.approved.total > 0) sections.push('approved');
  if (caps.personnel && inbox.myReports.total > 0) sections.push('myReports');

  return sections;
}

export function hasInboxContent(roles: readonly Role[], inbox: InboxResponse): boolean {
  return inboxSectionsFor(roles, inbox).length > 0;
}

export type InboxStat = {
  id: 'awaitingReview' | 'returned' | 'withPic';
  label: string;
  count: number;
  href: string;
};

/** At-a-glance numbers; a zero is never turned into a tile. */
export function inboxStatsFor(roles: readonly Role[], inbox: InboxResponse): InboxStat[] {
  const caps = capabilitiesFor(roles);
  const stats: InboxStat[] = [];

  if (caps.admin && inbox.awaitingReview.total > 0) {
    stats.push({
      id: 'awaitingReview',
      label: 'Awaiting your decision',
      count: inbox.awaitingReview.total,
      href: '/reports?tab=submitted',
    });
  }
  if (caps.admin && inbox.withPic.total > 0) {
    stats.push({
      id: 'withPic',
      label: 'With personnel in charge',
      count: inbox.withPic.total,
      href: '/reports?tab=withPic',
    });
  }
  if (inbox.returned.total > 0) {
    stats.push({
      id: 'returned',
      label: 'Returned for revision',
      count: inbox.returned.total,
      href: '/reports?tab=returned',
    });
  }

  return stats;
}

export type InboxRow = {
  id: string;
  href: string;
  referenceNo: string;
  title: string;
  meta: string;
  overdue: boolean;
  canResend: boolean;
};

function ageOf(item: InboxItem, now: Date): string {
  return formatAge(item.submittedAt ?? item.updatedAt, now);
}

function overdue(item: InboxItem, now: Date): boolean {
  const since = new Date(item.submittedAt ?? item.updatedAt).getTime();
  return Number.isFinite(since) && now.getTime() - since >= 7 * 24 * 60 * 60 * 1000;
}

function rowsFor(
  section: InboxSection,
  now: Date,
  meta: (item: InboxItem) => string,
  options: { overdue?: boolean; canResend?: boolean } = {},
): InboxRow[] {
  return section.items.slice(0, 3).map((item) => ({
    id: item.id,
    href: `/reports/${item.id}`,
    referenceNo: item.referenceNo,
    title: item.title,
    meta: meta(item),
    overdue: options.overdue ? overdue(item, now) : false,
    canResend: options.canResend ? overdue(item, now) : false,
  }));
}

/** Narratives waiting for the office's decision. */
export function awaitingReviewRows(section: InboxSection, now: Date): InboxRow[] {
  return rowsFor(section, now, (item) => `Submitted · ${ageOf(item, now)} ago`);
}

/** Records created but not yet submitted; overdue after seven days. */
export function withPicRows(section: InboxSection, now: Date): InboxRow[] {
  return section.items.slice(0, 3).map((item) => {
    const waiting = new Date(item.updatedAt).getTime();
    const stale = Number.isFinite(waiting) && now.getTime() - waiting >= 7 * 24 * 60 * 60 * 1000;

    return {
      id: item.id,
      href: `/reports/${item.id}`,
      referenceNo: item.referenceNo,
      title: item.title,
      meta: `${STATUS_PRESENTATION[item.status].label} · ${formatAge(item.updatedAt, now)}`,
      overdue: stale,
      canResend: stale,
    };
  });
}

export function returnedRows(section: InboxSection, now: Date): InboxRow[] {
  return rowsFor(
    section,
    now,
    (item) => `Revise and resubmit · ${formatRelativeTime(item.updatedAt, now)}`,
  );
}

export function approvedRows(section: InboxSection, now: Date): InboxRow[] {
  return rowsFor(
    section,
    now,
    (item) => `Approved · ${formatRelativeTime(item.submittedAt ?? item.updatedAt, now)}`,
  );
}

/** A personnel account's whole list of assignments. */
export function myReportRows(section: InboxSection, now: Date): InboxRow[] {
  return rowsFor(section, now, (item) => {
    const action =
      item.status === 'DRAFT'
        ? 'Write narrative'
        : item.status === 'RETURNED'
          ? 'Revise and resubmit'
          : item.status === 'APPROVED'
            ? 'Download receipt'
            : 'View';
    return `${action} · ${formatRelativeTime(item.updatedAt, now)}`;
  });
}

export type AdminAction = {
  id: 'failed-emails';
  title: string;
  count: number;
  href: string;
  linkLabel: string;
};

/** Zero-count admin cards are omitted, never shown as "(0)". */
export function adminActionsFor(admin: InboxAdmin): AdminAction[] {
  if (admin.failedEmails <= 0) return [];

  return [
    {
      id: 'failed-emails',
      title: 'Failed emails',
      count: admin.failedEmails,
      href: '/admin/emails',
      linkLabel: 'Open email log',
    },
  ];
}

export type ActivityRow = {
  id: string;
  href: string;
  prefix?: string;
  label: string;
  suffix?: string;
  occurredAt: string;
  relative: string;
  exact: string;
};

const ACTIVITY_SUFFIX: Record<InboxActivityKind, string> = {
  SUBMITTED: 'was submitted',
  RETURNED: 'was returned for revision',
  APPROVED: 'was approved',
};

export function reportActivityRows(
  activity: readonly InboxActivity[],
  now: Date = new Date(),
): ActivityRow[] {
  return activity.slice(0, 5).map((event) => ({
    id: event.id,
    href: `/reports/${event.reportId}`,
    label: `${event.referenceNo} — ${event.title}`,
    suffix: ACTIVITY_SUFFIX[event.kind],
    occurredAt: event.occurredAt,
    relative: formatRelativeTime(event.occurredAt, now),
    exact: formatDateTime(event.occurredAt),
  }));
}

const DECIDED_SUFFIX: Record<InboxActivityKind, string> = {
  SUBMITTED: 'was submitted',
  RETURNED: 'you returned for revision',
  APPROVED: 'you approved',
};

/** Decisions the caller recorded; the label reads as the action it took. */
export function recentlyDecidedRows(
  decided: readonly InboxActivity[],
  now: Date = new Date(),
): ActivityRow[] {
  return decided.slice(0, 3).map((event) => ({
    id: event.id,
    href: `/reports/${event.reportId}`,
    label: event.referenceNo,
    suffix: DECIDED_SUFFIX[event.kind],
    occurredAt: event.occurredAt,
    relative: formatRelativeTime(event.occurredAt, now),
    exact: formatDateTime(event.occurredAt),
  }));
}

export function auditActivityRows(
  events: readonly InboxAuditEvent[],
  now: Date = new Date(),
): ActivityRow[] {
  return events.slice(0, 3).map((event) => ({
    id: event.id,
    href: '/admin/audit',
    label: event.summary,
    occurredAt: event.occurredAt,
    relative: formatRelativeTime(event.occurredAt, now),
    exact: formatDateTime(event.occurredAt),
  }));
}


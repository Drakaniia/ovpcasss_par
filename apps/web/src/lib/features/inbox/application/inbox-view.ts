import { actsAs } from '@par/shared';
import type {
  InboxAdmin,
  InboxActivity,
  InboxActivityKind,
  InboxAuditEvent,
  InboxItem,
  InboxOnboarding,
  InboxResponse,
  Role,
} from '@par/shared';

import { formatDateTime } from '$lib/format/datetime';
import { formatAge, formatRelativeTime } from '$lib/format/relative-time';
import { nextStepText, STATUS_PRESENTATION } from '$lib/status/report-status';

/**
 * Work-inbox composition (UI spec §7.3). Roles decide which sections a person
 * may have; the server decides which ones actually have content. Sections keep
 * one fixed order and empty sections are omitted, never rendered as "0".
 */
export type InboxCapabilities = {
  submitter: boolean;
  reviewer: boolean;
  approver: boolean;
  admin: boolean;
};

export function capabilitiesFor(roles: readonly Role[]): InboxCapabilities {
  const can = (expected: Role) => roles.some((role) => actsAs(role, expected));

  return {
    submitter: can('SUBMITTER'),
    reviewer: can('REVIEWER'),
    approver: can('APPROVER'),
    admin: can('ADMIN'),
  };
}

export type InboxSectionId =
  'returned' | 'review' | 'approval' | 'admin' | 'drafts' | 'waiting' | 'activity';

export type InboxStat = {
  id: 'review' | 'approval' | 'returned' | 'drafts';
  label: string;
  count: number;
  href: string;
};

/**
 * At-a-glance numbers (signature spec §6.3). Only sections this role owns and
 * that actually have rows: a zero is never turned into a tile.
 */
export function inboxStatsFor(roles: readonly Role[], inbox: InboxResponse): InboxStat[] {
  const caps = capabilitiesFor(roles);
  const stats: InboxStat[] = [];

  if (caps.reviewer && inbox.review.total > 0) {
    stats.push({
      id: 'review',
      label: 'Awaiting review',
      count: inbox.review.total,
      href: '/review',
    });
  }
  if (caps.approver && inbox.approval.total > 0) {
    stats.push({
      id: 'approval',
      label: 'Awaiting approval',
      count: inbox.approval.total,
      href: '/approval',
    });
  }
  if (caps.submitter && inbox.returned.total > 0) {
    stats.push({
      id: 'returned',
      label: 'Returned to you',
      count: inbox.returned.total,
      href: '/reports?tab=returned',
    });
  }
  if (caps.submitter && inbox.drafts.total > 0) {
    stats.push({
      id: 'drafts',
      label: 'Drafts',
      count: inbox.drafts.total,
      href: '/reports?tab=drafts',
    });
  }

  return stats;
}

export function inboxSectionsFor(roles: readonly Role[], inbox: InboxResponse): InboxSectionId[] {
  const caps = capabilitiesFor(roles);
  const admin = caps.admin ? inbox.admin : null;
  const sections: InboxSectionId[] = [];

  if (caps.submitter && inbox.returned.total > 0) sections.push('returned');
  if (caps.reviewer && inbox.review.total > 0) sections.push('review');
  if (caps.approver && inbox.approval.total > 0) sections.push('approval');

  if (admin && adminActionsFor(admin).length > 0) sections.push('admin');

  if (caps.submitter && inbox.drafts.total > 0) sections.push('drafts');
  if (caps.submitter && inbox.waiting.total > 0) sections.push('waiting');
  if (inbox.activity.length > 0 || (admin && admin.auditEvents.length > 0)) {
    sections.push('activity');
  }

  return sections;
}

export function hasInboxContent(roles: readonly Role[], inbox: InboxResponse): boolean {
  return inboxSectionsFor(roles, inbox).length > 0;
}

export type InboxRow = {
  id: string;
  href: string;
  trackingNumber: string | null;
  title: string;
  meta: string;
  /** An administrator's own report stays visible, marked rather than hidden. */
  isOwn?: boolean;
};

/** Returned rows open the edit page, not the facsimile (phase 02 §3.1). */
export function returnedRows(items: readonly InboxItem[], now: Date = new Date()): InboxRow[] {
  return items.map((item) => ({
    id: item.id,
    href: `/reports/${item.id}/edit`,
    trackingNumber: item.trackingNumber,
    title: item.title,
    meta: `${STATUS_PRESENTATION[item.status].label} · ${formatRelativeTime(item.updatedAt, now)}`,
    isOwn: item.isOwn ?? false,
  }));
}

/** Queue rows open the matching detail route; the inbox offers no decisions. */
export function queueRows(
  items: readonly InboxItem[],
  queue: 'review' | 'approval',
  now: Date = new Date(),
): InboxRow[] {
  return items.map((item) => ({
    id: item.id,
    href: `/${queue}/${item.id}`,
    trackingNumber: item.trackingNumber,
    title: item.title,
    meta: `Submitted · ${formatAge(item.submittedAt ?? item.updatedAt, now)}`,
    isOwn: item.isOwn ?? false,
  }));
}

export function waitingRows(items: readonly InboxItem[], now: Date = new Date()): InboxRow[] {
  return items.map((item) => ({
    id: item.id,
    href: `/reports/${item.id}`,
    trackingNumber: item.trackingNumber,
    title: item.title,
    meta: `${nextStepText(item.status, item.submittedAt ?? undefined)} · ${formatAge(
      item.submittedAt ?? item.updatedAt,
      now,
    )}`,
    isOwn: item.isOwn ?? false,
  }));
}

export type AdminAction = {
  id: 'failed-emails';
  title: string;
  count: number;
  href: string;
  linkLabel: string;
};

/** Zero-count admin cards are omitted, never shown as "(0)" (phase 02 §4). */
export function adminActionsFor(admin: InboxAdmin): AdminAction[] {
  const actions: AdminAction[] = [];

  if (admin.failedEmails > 0) {
    actions.push({
      id: 'failed-emails',
      title: 'Failed emails',
      count: admin.failedEmails,
      href: '/admin/audit',
      linkLabel: 'Open audit log',
    });
  }

  return actions;
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
  RESUBMITTED: 'was resubmitted',
  RETURNED_BY_REVIEWER: 'was returned by the reviewer',
  RETURNED_BY_APPROVER: 'was returned by the approver',
  ENDORSED: 'was endorsed',
  APPROVED: 'was approved',
};

export function reportActivityRows(
  activity: readonly InboxActivity[],
  now: Date = new Date(),
): ActivityRow[] {
  return activity.slice(0, 5).map((event) => ({
    id: event.id,
    href: `/reports/${event.reportId}`,
    prefix: 'Your report',
    label: event.trackingNumber ?? event.title,
    suffix: ACTIVITY_SUFFIX[event.kind],
    occurredAt: event.occurredAt,
    relative: formatRelativeTime(event.occurredAt, now),
    exact: formatDateTime(event.occurredAt),
  }));
}

const DECIDED_SUFFIX: Record<InboxActivityKind, string> = {
  SUBMITTED: 'was submitted by you',
  RESUBMITTED: 'was resubmitted by you',
  RETURNED_BY_REVIEWER: 'you returned as reviewer',
  RETURNED_BY_APPROVER: 'you returned as approver',
  ENDORSED: 'you endorsed',
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
    label: event.trackingNumber ?? event.title,
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

export type ChecklistStep = {
  id: 'profile' | 'create' | 'submit';
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  complete: boolean;
};

/**
 * Derived first-run checklist (phase 02 §5): no dismiss, no modal, text
 * progress only. Step 3 links to the draft when one exists.
 */
export function checklistFor(onboarding: InboxOnboarding): ChecklistStep[] {
  const draftHref = onboarding.draftId ? `/reports/${onboarding.draftId}/edit` : '/reports/new';
  const hasReport = onboarding.hasSubmitted || onboarding.draftId !== null;

  return [
    {
      id: 'profile',
      title: 'Complete your profile',
      description: 'Add your campus or unit and contact number.',
      href: '/profile',
      linkLabel: 'Open profile',
      complete: onboarding.profileComplete,
    },
    {
      id: 'create',
      title: 'Create your first report',
      description: 'Start a Post-Activity Report for a completed activity.',
      href: draftHref,
      linkLabel: onboarding.draftId ? 'Continue draft' : 'New report',
      complete: hasReport,
    },
    {
      id: 'submit',
      title: 'Submit it for review',
      description:
        'Submitting issues a tracking number and sends the report to the OVPCASSS reviewer.',
      href: draftHref,
      linkLabel: onboarding.draftId ? 'Continue draft' : 'New report',
      complete: onboarding.hasSubmitted,
    },
  ];
}

export function completedStepCount(steps: readonly ChecklistStep[]): number {
  return steps.filter((step) => step.complete).length;
}

import type { QueueItem, QueueKind, ReportStatus } from '@par/shared';
import { queueAgeAttention, queueAgeLabel, workingDaysSince } from '@par/shared';

import { formatDate, formatDateTime } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

import { queuePath } from './queue-filters';

/**
 * Queue rows and their copy (UI spec §7.9). The review and approval queues share
 * one template: only the waiting-date column and the decision buttons differ.
 */
export type QueueRow = {
  id: string;
  href: string;
  trackingNumber: string | null;
  title: string;
  typeLabel: string;
  college: string;
  status: ReportStatus;
  /** `20 Mar 2026`, shown next to the exact timestamp. */
  waitingDate: string;
  waitingExact: string;
  ageDays: number;
  ageLabel: string;
  ageAttention: boolean;
  submitterName: string;
  hasPendingAttachments: boolean;
  /** The caller submitted it; an administrator may still decide it. */
  isOwn: boolean;
};

export function queueTitle(kind: QueueKind): string {
  return kind === 'review' ? 'Review queue' : 'Approval queue';
}

/** The approval queue shows when the reviewer passed it, not when it arrived. */
export function queueWaitingHeading(kind: QueueKind): string {
  return kind === 'review' ? 'Submitted' : 'Endorsed';
}

export function queueRowFromItem(
  item: QueueItem,
  options: { kind: QueueKind; now?: Date; search?: string },
): QueueRow {
  const now = options.now ?? new Date();
  const ageDays = workingDaysSince(item.waitingSince, now);

  return {
    id: item.id,
    href: options.search
      ? `${queuePath(options.kind, item.id)}?${options.search}`
      : queuePath(options.kind, item.id),
    trackingNumber: item.trackingNumber,
    title: item.title,
    typeLabel: REPORT_TYPE_LABELS[item.type],
    college: item.college,
    status: item.status,
    waitingDate: formatDate(item.waitingSince),
    waitingExact: formatDateTime(item.waitingSince),
    ageDays,
    ageLabel: queueAgeLabel(ageDays),
    ageAttention: queueAgeAttention(ageDays),
    submitterName: item.submitterName,
    hasPendingAttachments: item.hasPendingAttachments,
    isOwn: item.isOwn ?? false,
  };
}

export type QueueSummary = { count: string; age: string; attention: boolean };

/** "4 reports · oldest 3 days"; the age turns warning-colored past 3 days. */
export function queueSummary(total: number, oldestAgeDays: number): QueueSummary | null {
  if (total <= 0) return null;

  return {
    count: `${total} ${total === 1 ? 'report' : 'reports'}`,
    age: `oldest ${queueAgeLabel(oldestAgeDays)}`,
    attention: queueAgeAttention(oldestAgeDays),
  };
}

export type QueueEmptyState = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function queueEmptyState(
  kind: QueueKind,
  options: { hasFilters: boolean; filteredHref: string; repositoryHref: string },
): QueueEmptyState {
  if (options.hasFilters) {
    return {
      title: 'No reports match these filters.',
      description: 'Adjust the filters, or clear them to see the whole queue.',
      action: { label: 'Clear filters', href: options.filteredHref },
    };
  }

  return {
    title: kind === 'review' ? 'Nothing waiting for review.' : 'Nothing waiting for approval.',
    description:
      kind === 'review'
        ? 'New submissions appear here and are emailed to you.'
        : 'Endorsed reports appear here and are emailed to you.',
    action: { label: 'Open repository', href: options.repositoryHref },
  };
}

/** The master–detail pane before a row is picked. */
export function queueSelectionPrompt(kind: QueueKind): string {
  return kind === 'review' ? 'Select a report to review' : 'Select a report to approve';
}

export const QUEUE_SELECTION_HINT =
  'The report opens here with its facsimile summary and the decision buttons.';

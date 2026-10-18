import type { ReportCommentRound, ReportDetail, ReportHistoryEvent } from '@par/shared';

import { formatDate, formatTime } from '$lib/format/datetime';
import { ROLE_LABELS } from '$lib/navigation/navigation';
import { STATUS_PRESENTATION } from '$lib/status/report-status';

/**
 * Facsimile timeline and review rounds (UI spec §7.7, §8.1). History is grouped
 * by the Manila day, ascending, and never reordered by the API's payload order.
 * Comments stay in the document as rounds; there is no composer on this page.
 */

export type HistoryEntry = {
  id: string;
  time: string;
  actorName: string;
  roleLabel: string;
  action: string;
  statusChange?: string;
  comment?: string;
  current: boolean;
};

export type HistoryGroup = { day: string; entries: HistoryEntry[] };

const EXCERPT_LENGTH = 160;

export function excerpt(text: string, length = EXCERPT_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= length) return trimmed;
  return `${trimmed.slice(0, length).trimEnd()}…`;
}

function statusChange(event: ReportHistoryEvent): string | undefined {
  if (!event.fromStatus || !event.toStatus || event.fromStatus === event.toStatus) return undefined;
  return `${STATUS_PRESENTATION[event.fromStatus].label} → ${STATUS_PRESENTATION[event.toStatus].label}`;
}

export function historyGroups(events: readonly ReportHistoryEvent[]): HistoryGroup[] {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const groups: HistoryGroup[] = [];

  sorted.forEach((event, index) => {
    const day = formatDate(event.at);
    const entry: HistoryEntry = {
      id: event.id ?? `${event.at}-${index}`,
      time: formatTime(event.at),
      actorName: event.actorName,
      roleLabel: ROLE_LABELS[event.actorRole],
      action: event.action,
      current: index === sorted.length - 1,
      ...(statusChange(event) ? { statusChange: statusChange(event) } : {}),
      ...(event.comment ? { comment: excerpt(event.comment) } : {}),
    };

    const group = groups.find((candidate) => candidate.day === day);
    if (group) group.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  });

  return groups;
}

/** Latest return is always present; the full list arrives when the API sends it. */
export function commentRounds(detail: ReportDetail): ReportCommentRound[] {
  if (detail.commentRounds && detail.commentRounds.length > 0) {
    return [...detail.commentRounds].sort((a, b) => a.round - b.round);
  }

  const event = detail.returnEvent;
  if (!event) return [];

  return [
    {
      round: event.round ?? 1,
      authorName: event.authorName,
      authorRole: event.authorRole,
      createdAt: event.createdAt,
      comments: event.comments,
    },
  ];
}

export function roundAnchor(round: ReportCommentRound): string {
  return `review-history-round-${round.round}`;
}

export function roundHeading(round: ReportCommentRound): string {
  const author = `${round.authorName} (${ROLE_LABELS[round.authorRole]})`;
  return `Round ${round.round} — returned by ${author}, ${formatDate(round.createdAt)}`;
}

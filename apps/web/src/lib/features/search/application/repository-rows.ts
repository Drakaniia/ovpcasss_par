import type { ReportFilterOption, RepositoryItem, RepositoryStatus } from '@par/shared';

import { formatDate, formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
import { classificationLabel, levelLabel } from '$lib/features/reports/application/record-form';

/**
 * Repository result rows and their copy (UI spec §7.11). A row carries the six
 * table columns, the report href, and the matched segments of its title and
 * snippet, so the table stays markup and the highlight rule is unit-tested.
 */

export type HighlightSegment = {
  text: string;
  match: boolean;
};

/** Terms are matched case-insensitively; the pattern is capped so typing stays cheap. */
const MAX_TERMS = 8;

export function highlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [];
  if (!query.trim()) return [{ text, match: false }];

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (terms.length === 0) return [{ text, match: false }];

  const pattern = new RegExp(terms.join('|'), 'gi');
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: found[0], match: true });
    cursor = start + found[0].length;
  }

  if (segments.length === 0) return [{ text, match: false }];
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });

  return segments;
}

export type RepositoryRow = {
  id: string;
  href: string;
  referenceNo: string | null;
  title: string;
  titleSegments: HighlightSegment[];
  /** Narrative excerpt around the match, when the API found one. */
  snippet: string | null;
  snippetSegments: HighlightSegment[];
  typeLabel: string;
  classificationLabel: string;
  levelLabel: string;
  college: string;
  status: RepositoryStatus;
  /** `14 Mar 2026`, the register's date received. */
  received: string;
  activity: string;
};

export function repositoryRowFromItem(
  item: RepositoryItem,
  options: { query?: string } = {},
): RepositoryRow {
  const query = options.query ?? '';

  return {
    id: item.id,
    href: `/reports/${item.id}`,
    referenceNo: item.referenceNo,
    title: item.title,
    titleSegments: highlightSegments(item.title, query),
    snippet: item.snippet ?? null,
    snippetSegments: highlightSegments(item.snippet ?? '', query),
    typeLabel: REPORT_TYPE_LABELS[item.type],
    classificationLabel: classificationLabel(item.classification),
    levelLabel: levelLabel(item.level),
    college: item.college,
    status: item.status,
    received: formatDate(item.receivedAt),
    activity: formatDateRange(item.activityStartDate, item.activityEndDate),
  };
}

/** The result count is always scoped: "212 reports match", never a bare number. */
export function countLine(total: number): string {
  if (total === 1) return '1 report matches';
  return `${total} reports match`;
}

export type RepositoryEmptyState = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

/**
 * The repository is never an empty page: with no query and no filters it lists
 * every approved report, so the only genuinely empty case is an untouched
 * register (UI spec §7.11, §4).
 */
export function repositoryEmptyState(options: {
  hasFilters: boolean;
  hasQuery: boolean;
  clearHref: string;
}): RepositoryEmptyState {
  if (options.hasFilters || options.hasQuery) {
    return {
      title: 'No reports matched.',
      description: 'Adjust the search term or the filters, then try again.',
      action: { label: 'Clear filters', href: options.clearHref },
    };
  }

  return {
    title: 'No approved reports yet.',
    description:
      'Approved post-activity reports appear here once the approving officer completes them.',
  };
}

export const REPOSITORY_SCOPE_LINE = 'Approved post-activity reports from all campuses and terms.';

export const REPOSITORY_IDLE_LINE = 'Search the repository';

/**
 * The three most-used filters offered when a search matched nothing. They are
 * real controls: choosing a value applies that filter and runs the search.
 */
export const REPOSITORY_SUGGESTIONS = ['type', 'term', 'college'] as const;
export type RepositorySuggestionId = (typeof REPOSITORY_SUGGESTIONS)[number];

export const SUGGESTION_LABELS: Record<RepositorySuggestionId, string> = {
  type: 'Type',
  term: 'Term',
  college: 'College',
};

/** The result list is a search result, not a page: it never claims partial data. */
export const SEARCH_TIMEOUT_COPY = {
  title: 'The search did not finish',
  description:
    'It took too long and was stopped. Your last results are still shown; narrow the filters and try again.',
} as const;

export const SEARCH_TIMEOUT_CODES = new Set(['SEARCH_TIMEOUT', 'SEARCH_TOO_LARGE']);

/** Options for a select that must keep showing a value the facets no longer carry. */
export function optionsWithCurrent(
  options: readonly ReportFilterOption[],
  currentId: string,
): ReportFilterOption[] {
  if (!currentId || options.some((option) => option.id === currentId)) return [...options];
  return [{ id: currentId, label: currentId, isActive: false }, ...options];
}

import type { QueueListQuery, QueueSort, ReportType } from '@par/shared';
import { QUEUE_PAGE_SIZE, QUEUE_SORTS, REPORT_TYPES } from '@par/shared';

/**
 * Queue filter state (UI spec §7.9). Filters and sort live in the URL, so a
 * shared queue link reproduces exactly what the sender saw — and the detail
 * route can carry the same state back to the queue.
 */
export type QueueFilters = {
  type: ReportType | '';
  campusId: string;
  collegeId: string;
  sort: QueueSort;
  page: number;
};

/** Oldest first is the backlog default; the queue is not a feed. */
export const DEFAULT_QUEUE_FILTERS: QueueFilters = {
  type: '',
  campusId: '',
  collegeId: '',
  sort: 'oldest',
  page: 1,
};

const TYPE_SET = new Set<string>(REPORT_TYPES);
const SORT_SET = new Set<string>(QUEUE_SORTS);

function isType(value: string | null): value is ReportType {
  return value !== null && TYPE_SET.has(value);
}

function isSort(value: string | null): value is QueueSort {
  return value !== null && SORT_SET.has(value);
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads URL state; unknown values fall back instead of inventing a filter. */
export function queueFiltersFromParams(params: URLSearchParams): QueueFilters {
  return {
    type: isType(params.get('type')) ? (params.get('type') as ReportType) : '',
    campusId: params.get('campus') ?? '',
    collegeId: params.get('college') ?? '',
    sort: isSort(params.get('sort')) ? (params.get('sort') as QueueSort) : 'oldest',
    page: positiveInt(params.get('page'), 1),
  };
}

/** Writes only what differs from the default, so shared URLs stay readable. */
export function queueFiltersToParams(filters: QueueFilters): string {
  const params = new URLSearchParams();

  if (filters.type) params.set('type', filters.type);
  if (filters.campusId) params.set('campus', filters.campusId);
  if (filters.collegeId) params.set('college', filters.collegeId);
  if (filters.sort !== 'oldest') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params.toString();
}

export function queueFiltersEqual(a: QueueFilters, b: QueueFilters): boolean {
  return (
    a.type === b.type &&
    a.campusId === b.campusId &&
    a.collegeId === b.collegeId &&
    a.sort === b.sort &&
    a.page === b.page
  );
}

/** Changing scope restarts at page 1; paging keeps the filters. */
export function updateQueueFilters(
  current: QueueFilters,
  patch: Partial<QueueFilters>,
): QueueFilters {
  const next = { ...current, ...patch };
  const rescopes = (['type', 'campusId', 'collegeId', 'sort'] as const).some((key) => key in patch);

  if (rescopes && patch.page === undefined) next.page = 1;
  return next;
}

export function hasQueueFilters(filters: QueueFilters): boolean {
  return filters.type !== '' || filters.campusId !== '' || filters.collegeId !== '';
}

/** Clear all keeps the sort and the page they are on. */
export function clearedQueueFilters(filters: QueueFilters): QueueFilters {
  return { ...DEFAULT_QUEUE_FILTERS, sort: filters.sort };
}

export function queueQueryFor(filters: QueueFilters): QueueListQuery {
  return {
    type: filters.type || undefined,
    campus: filters.campusId || undefined,
    college: filters.collegeId || undefined,
    sort: filters.sort,
    page: filters.page,
    size: QUEUE_PAGE_SIZE,
  };
}

/** Path plus the current filters: the detail route carries them to the return link. */
export function queueHref(path: string, filters?: QueueFilters | string): string {
  const search =
    typeof filters === 'string' ? filters : queueFiltersToParams(filters ?? DEFAULT_QUEUE_FILTERS);
  return search ? `${path}?${search}` : path;
}

/** Queue paths are `review` or `approval`; both share one template. */
export function queuePath(kind: 'review' | 'approval', id?: string): string {
  return id ? `/${kind}/${id}` : `/${kind}`;
}

export const QUEUE_SORT_LABELS: Record<QueueSort, string> = {
  oldest: 'Oldest first',
  newest: 'Newest first',
  age: 'Age (working days)',
};

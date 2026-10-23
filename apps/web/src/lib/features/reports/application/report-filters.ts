import type {
  ReportArchiveFilter,
  ReportFilterOption,
  ReportListFacets,
  ReportListQuery,
  ReportListTab,
  ReportPageSize,
  ReportSortField,
  ReportType,
  SortDirection,
} from '@par/shared';
import {
  REPORT_ARCHIVE_FILTERS,
  REPORT_LIST_TABS,
  REPORT_PAGE_SIZES,
  REPORT_SORT_FIELDS,
  REPORT_TYPES,
  SORT_DIRECTIONS,
} from '@par/shared';

import { formatDate } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

/**
 * My reports filter state (UI spec §7.4). Filters, tab, sort, and paging live in
 * the URL, so a shared link reproduces exactly what the sender saw.
 */

export type ReportFilters = {
  tab: ReportListTab;
  /** A filing scope, not a filter chip: archived rows are hidden by default. */
  archived: ReportArchiveFilter;
  type: ReportType | '';
  campusId: string;
  termId: string;
  from: string;
  to: string;
  q: string;
  /** Free-text name matches (spec §8.1); never an account picker. */
  picName: string;
  submittedBy: string;
  sort: ReportSortField;
  dir: SortDirection;
  page: number;
  pageSize: ReportPageSize;
};

/** Updated descending is the table's default; the other headers start ascending. */
export function defaultDirectionFor(sort: ReportSortField): SortDirection {
  return sort === 'updated' ? 'desc' : 'asc';
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  tab: 'all',
  archived: 'active',
  type: '',
  campusId: '',
  termId: '',
  from: '',
  to: '',
  q: '',
  picName: '',
  submittedBy: '',
  sort: 'updated',
  dir: 'desc',
  page: 1,
  pageSize: 25,
};

const TAB_SET = new Set<string>(REPORT_LIST_TABS);
const SORT_SET = new Set<string>(REPORT_SORT_FIELDS);
const TYPE_SET = new Set<string>(REPORT_TYPES);
const DIRECTION_SET = new Set<string>(SORT_DIRECTIONS);
const ARCHIVE_SET = new Set<string>(REPORT_ARCHIVE_FILTERS);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isTab(value: string | null): value is ReportListTab {
  return value !== null && TAB_SET.has(value);
}

function isSort(value: string | null): value is ReportSortField {
  return value !== null && SORT_SET.has(value);
}

function isType(value: string | null): value is ReportType {
  return value !== null && TYPE_SET.has(value);
}

function isDirection(value: string | null): value is SortDirection {
  return value !== null && DIRECTION_SET.has(value);
}

function isoDate(value: string | null): string {
  return value !== null && ISO_DATE.test(value) ? value : '';
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads URL state; unknown values fall back instead of inventing a filter. */
export function filtersFromParams(params: URLSearchParams): ReportFilters {
  const sort = isSort(params.get('sort')) ? params.get('sort') : DEFAULT_REPORT_FILTERS.sort;
  const dirParam = params.get('dir');
  const size = Number(params.get('size'));

  return {
    tab: isTab(params.get('tab')) ? (params.get('tab') as ReportListTab) : 'all',
    archived: ARCHIVE_SET.has(params.get('archived') ?? '')
      ? (params.get('archived') as ReportArchiveFilter)
      : 'active',
    type: isType(params.get('type')) ? (params.get('type') as ReportType) : '',
    campusId: params.get('campus') ?? '',
    termId: params.get('term') ?? '',
    from: isoDate(params.get('from')),
    to: isoDate(params.get('to')),
    q: params.get('q')?.trim().slice(0, 120) ?? '',
    picName: params.get('picName')?.trim().slice(0, 120) ?? '',
    submittedBy: params.get('submittedBy')?.trim().slice(0, 120) ?? '',
    sort: sort as ReportSortField,
    dir: isDirection(dirParam) ? dirParam : defaultDirectionFor(sort as ReportSortField),
    page: positiveInt(params.get('page'), 1),
    pageSize: (REPORT_PAGE_SIZES as readonly number[]).includes(size)
      ? (size as ReportPageSize)
      : DEFAULT_REPORT_FILTERS.pageSize,
  };
}

/** Writes only what differs from the default, so shared URLs stay readable. */
export function filtersToParams(filters: ReportFilters): string {
  const params = new URLSearchParams();

  if (filters.tab !== 'all') params.set('tab', filters.tab);
  if (filters.archived !== 'active') params.set('archived', filters.archived);
  if (filters.type) params.set('type', filters.type);
  if (filters.campusId) params.set('campus', filters.campusId);
  if (filters.termId) params.set('term', filters.termId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);
  if (filters.picName) params.set('picName', filters.picName);
  if (filters.submittedBy) params.set('submittedBy', filters.submittedBy);
  if (filters.sort !== 'updated') params.set('sort', filters.sort);
  if (filters.dir !== defaultDirectionFor(filters.sort)) params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_REPORT_FILTERS.pageSize) {
    params.set('size', String(filters.pageSize));
  }

  return params.toString();
}

export function filtersToQuery(filters: ReportFilters): ReportListQuery {
  return {
    tab: filters.tab,
    archived: filters.archived,
    type: filters.type || undefined,
    campus: filters.campusId || undefined,
    term: filters.termId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    q: filters.q || undefined,
    picName: filters.picName || undefined,
    submittedBy: filters.submittedBy || undefined,
    sort: filters.sort,
    dir: filters.dir,
    page: filters.page,
    size: filters.pageSize,
  };
}

export function filtersEqual(a: ReportFilters, b: ReportFilters): boolean {
  return (
    a.tab === b.tab &&
    a.archived === b.archived &&
    a.type === b.type &&
    a.campusId === b.campusId &&
    a.termId === b.termId &&
    a.from === b.from &&
    a.to === b.to &&
    a.q === b.q &&
    a.picName === b.picName &&
    a.submittedBy === b.submittedBy &&
    a.sort === b.sort &&
    a.dir === b.dir &&
    a.page === b.page &&
    a.pageSize === b.pageSize
  );
}

/** Changing scope restarts at page 1; paging and sorting keep the page. */
export function updateFilters(
  current: ReportFilters,
  patch: Partial<ReportFilters>,
): ReportFilters {
  const next = { ...current, ...patch };
  const rescopes = (
    [
      'tab',
      'archived',
      'type',
      'campusId',
      'termId',
      'from',
      'to',
      'q',
      'picName',
      'submittedBy',
      'pageSize',
    ] as const
  ).some((key) => key in patch);

  if (rescopes && patch.page === undefined) next.page = 1;
  return next;
}

export function hasActiveFilters(filters: ReportFilters): boolean {
  return (
    filters.type !== '' ||
    filters.campusId !== '' ||
    filters.termId !== '' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.q !== '' ||
    filters.picName !== '' ||
    filters.submittedBy !== ''
  );
}

/** Clear all keeps the tab, archive scope, sort, direction, and row count. */
export function clearedFilters(filters: ReportFilters): ReportFilters {
  return {
    ...DEFAULT_REPORT_FILTERS,
    tab: filters.tab,
    archived: filters.archived,
    sort: filters.sort,
    dir: filters.dir,
    pageSize: filters.pageSize,
  };
}

export type ReportFilterChipId =
  'type' | 'campus' | 'term' | 'from' | 'to' | 'picName' | 'submittedBy';

export type ReportFilterChip = {
  id: ReportFilterChipId;
  label: string;
  /** A saved URL may reference a deactivated value; show it, do not drop it. */
  inactive?: boolean;
  title?: string;
};

function facetOption(
  options: readonly ReportFilterOption[],
  id: string,
): ReportFilterOption | undefined {
  return options.find((option) => option.id === id);
}

export function activeChips(
  filters: ReportFilters,
  facets: ReportListFacets | null,
): ReportFilterChip[] {
  const chips: ReportFilterChip[] = [];

  if (filters.type) chips.push({ id: 'type', label: REPORT_TYPE_LABELS[filters.type] });

  for (const [id, value, options] of [
    ['campus', filters.campusId, facets?.campuses],
    ['term', filters.termId, facets?.terms],
  ] as const) {
    if (!value) continue;
    const option = options ? facetOption(options, value) : undefined;
    chips.push({
      id,
      label: option?.label ?? value,
      inactive: !option || !option.isActive,
      title: option ? undefined : 'This value is no longer in the reference data.',
    });
  }

  if (filters.from) chips.push({ id: 'from', label: `From ${formatDate(filters.from)}` });
  if (filters.to) chips.push({ id: 'to', label: `To ${formatDate(filters.to)}` });
  if (filters.picName) {
    chips.push({ id: 'picName', label: `Personnel: ${filters.picName}` });
  }
  if (filters.submittedBy) {
    chips.push({ id: 'submittedBy', label: `Submitted by: ${filters.submittedBy}` });
  }

  return chips;
}

/** Count for the collapsed "Filters (n)" button; the date range counts once. */
export function activeFilterCount(filters: ReportFilters): number {
  return (
    (filters.type ? 1 : 0) +
    (filters.campusId ? 1 : 0) +
    (filters.termId ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.picName ? 1 : 0) +
    (filters.submittedBy ? 1 : 0)
  );
}

export function removedFilter(id: ReportFilterChipId): Partial<ReportFilters> {
  switch (id) {
    case 'type':
      return { type: '' };
    case 'campus':
      return { campusId: '' };
    case 'term':
      return { termId: '' };
    case 'from':
      return { from: '' };
    case 'to':
      return { to: '' };
    case 'picName':
      return { picName: '' };
    case 'submittedBy':
      return { submittedBy: '' };
  }
}

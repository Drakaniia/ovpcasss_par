import type {
  Classification,
  Level,
  ReportType,
  RepositorySortField,
  RepositoryStatus,
  SortDirection,
} from '@par/shared';
import {
  CLASSIFICATIONS,
  LEVELS,
  REPOSITORY_DEFAULT_STATUS,
  REPOSITORY_SORT_FIELDS,
  REPOSITORY_STATUSES,
  REPORT_TYPES,
  SORT_DIRECTIONS,
} from '@par/shared';

/**
 * Repository filter state (UI spec §7.11). The query, every filter, the sort,
 * and the page live in the URL, so a shared link — or the handoff to exports —
 * reproduces exactly the scope that produced the results.
 */
export type RepositoryFilters = {
  /** Free text over title, narrative, PIC, and location. */
  q: string;
  tracking: string;
  title: string;
  type: ReportType | '';
  classification: Classification | '';
  campusId: string;
  collegeId: string;
  termId: string;
  department: string;
  office: string;
  level: Level | '';
  sdgIds: string[];
  /** Approved is the register's default scope, not an empty filter. */
  status: RepositoryStatus;
  receivedFrom: string;
  receivedTo: string;
  activityFrom: string;
  activityTo: string;
  pic: string;
  sort: RepositorySortField;
  dir: SortDirection;
  page: number;
};

export const DEFAULT_REPOSITORY_FILTERS: RepositoryFilters = {
  q: '',
  tracking: '',
  title: '',
  type: '',
  classification: '',
  campusId: '',
  collegeId: '',
  termId: '',
  department: '',
  office: '',
  level: '',
  sdgIds: [],
  status: REPOSITORY_DEFAULT_STATUS,
  receivedFrom: '',
  receivedTo: '',
  activityFrom: '',
  activityTo: '',
  pic: '',
  sort: 'received',
  dir: 'desc',
  page: 1,
};

const TYPE_SET = new Set<string>(REPORT_TYPES);
const CLASSIFICATION_SET = new Set<string>(CLASSIFICATIONS);
const LEVEL_SET = new Set<string>(LEVELS);
const STATUS_SET = new Set<string>(REPOSITORY_STATUSES);
const SORT_SET = new Set<string>(REPOSITORY_SORT_FIELDS);
const DIRECTION_SET = new Set<string>(SORT_DIRECTIONS);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 120;

function oneOf<T extends string>(set: Set<string>, value: string | null, fallback: T | ''): T | '' {
  return value !== null && set.has(value) ? (value as T) : fallback;
}

function isoDate(value: string | null): string {
  return value !== null && ISO_DATE.test(value) ? value : '';
}

function text(value: string | null): string {
  return value?.trim().slice(0, MAX_TEXT) ?? '';
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Newest received first is the default; a new header starts ascending. */
export function defaultDirectionFor(sort: RepositorySortField): SortDirection {
  return sort === 'received' ? 'desc' : 'asc';
}

/** Reads URL state; unknown values fall back instead of inventing a filter. */
export function filtersFromParams(params: URLSearchParams): RepositoryFilters {
  const sort = oneOf<RepositorySortField>(SORT_SET, params.get('sort'), 'received') || 'received';
  const dir = params.get('dir');

  return {
    q: text(params.get('q')),
    tracking: text(params.get('tracking')),
    title: text(params.get('title')),
    type: oneOf<ReportType>(TYPE_SET, params.get('type'), ''),
    classification: oneOf<Classification>(CLASSIFICATION_SET, params.get('classification'), ''),
    campusId: params.get('campus') ?? '',
    collegeId: params.get('college') ?? '',
    termId: params.get('term') ?? '',
    department: text(params.get('department')),
    office: text(params.get('office')),
    level: oneOf<Level>(LEVEL_SET, params.get('level'), ''),
    sdgIds: (params.get('sdg') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    status: (oneOf<RepositoryStatus>(STATUS_SET, params.get('status'), '') ||
      REPOSITORY_DEFAULT_STATUS) as RepositoryStatus,
    receivedFrom: isoDate(params.get('receivedFrom')),
    receivedTo: isoDate(params.get('receivedTo')),
    activityFrom: isoDate(params.get('activityFrom')),
    activityTo: isoDate(params.get('activityTo')),
    pic: text(params.get('pic')),
    sort,
    dir:
      dir !== null && DIRECTION_SET.has(dir) ? (dir as SortDirection) : defaultDirectionFor(sort),
    page: positiveInt(params.get('page'), 1),
  };
}

/** Writes only what differs from the default, so shared URLs stay readable. */
export function filtersToParams(filters: RepositoryFilters): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string) => {
    if (value) params.set(key, value);
  };

  set('q', filters.q);
  set('tracking', filters.tracking);
  set('title', filters.title);
  set('type', filters.type);
  set('classification', filters.classification);
  set('campus', filters.campusId);
  set('college', filters.collegeId);
  set('term', filters.termId);
  set('department', filters.department);
  set('office', filters.office);
  set('level', filters.level);
  set('sdg', filters.sdgIds.join(','));
  if (filters.status !== REPOSITORY_DEFAULT_STATUS) params.set('status', filters.status);
  set('receivedFrom', filters.receivedFrom);
  set('receivedTo', filters.receivedTo);
  set('activityFrom', filters.activityFrom);
  set('activityTo', filters.activityTo);
  set('pic', filters.pic);
  if (filters.sort !== 'received') params.set('sort', filters.sort);
  if (filters.dir !== defaultDirectionFor(filters.sort)) params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params.toString();
}

export function repositoryHref(filters: RepositoryFilters): string {
  const search = filtersToParams(filters);
  return search ? `/search?${search}` : '/search';
}

/**
 * "Export these results" hands the same scope to the export screen (§7.11). The
 * page is not part of a scope, so it is dropped; the export screen owns the file.
 */
export function exportHref(filters: RepositoryFilters): string {
  const search = filtersToParams({ ...filters, page: 1 });
  return search ? `/exports?${search}` : '/exports';
}

export function filtersEqual(a: RepositoryFilters, b: RepositoryFilters): boolean {
  return (
    a.q === b.q &&
    a.tracking === b.tracking &&
    a.title === b.title &&
    a.type === b.type &&
    a.classification === b.classification &&
    a.campusId === b.campusId &&
    a.collegeId === b.collegeId &&
    a.termId === b.termId &&
    a.department === b.department &&
    a.office === b.office &&
    a.level === b.level &&
    a.sdgIds.join(',') === b.sdgIds.join(',') &&
    a.status === b.status &&
    a.receivedFrom === b.receivedFrom &&
    a.receivedTo === b.receivedTo &&
    a.activityFrom === b.activityFrom &&
    a.activityTo === b.activityTo &&
    a.pic === b.pic &&
    a.sort === b.sort &&
    a.dir === b.dir &&
    a.page === b.page
  );
}

/** Fields that describe results; changing one restarts at page 1. */
export const RESCOPING_FIELDS = [
  'q',
  'tracking',
  'title',
  'type',
  'classification',
  'campusId',
  'collegeId',
  'termId',
  'department',
  'office',
  'level',
  'sdgIds',
  'status',
  'receivedFrom',
  'receivedTo',
  'activityFrom',
  'activityTo',
  'pic',
  'sort',
  'dir',
] as const satisfies readonly (keyof RepositoryFilters)[];

export function updateFilters(
  current: RepositoryFilters,
  patch: Partial<RepositoryFilters>,
): RepositoryFilters {
  const next = { ...current, ...patch };
  const rescopes = RESCOPING_FIELDS.some((field) => field in patch);
  if (rescopes && patch.page === undefined) next.page = 1;
  return next;
}

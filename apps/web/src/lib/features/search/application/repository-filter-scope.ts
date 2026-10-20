import type { RepositoryQuery, RepositorySortField } from '@par/shared';
import { REPOSITORY_DEFAULT_STATUS, REPOSITORY_PAGE_SIZE } from '@par/shared';

import {
  DEFAULT_REPOSITORY_FILTERS,
  defaultDirectionFor,
  type RepositoryFilters,
} from './repository-filters';

/**
 * What the current filters mean (UI spec §7.11): which of them count as active,
 * how many the "Filters (n)" button reports, what the API query is, and whether
 * a date range blocks Apply.
 */
export type RepositoryFilterField = Exclude<keyof RepositoryFilters, 'sort' | 'dir' | 'page' | 'q'>;

/** The default status is the register's scope, so it is not an "active" filter. */
function isActiveField(filters: RepositoryFilters, field: RepositoryFilterField): boolean {
  if (field === 'status') return filters.status !== REPOSITORY_DEFAULT_STATUS;
  if (field === 'sdgIds') return filters.sdgIds.length > 0;
  return filters[field] !== '';
}

/** Panel order, which is also the order of the chips and the scope echo. */
export const ACTIVE_FIELDS = [
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
] as const satisfies readonly RepositoryFilterField[];

export function hasQuery(filters: RepositoryFilters): boolean {
  return filters.q !== '';
}

export function hasActiveFilters(filters: RepositoryFilters): boolean {
  return ACTIVE_FIELDS.some((field) => isActiveField(filters, field));
}

/** The “Filters (n)” count; both ends of a date range count once. */
export function activeFilterCount(filters: RepositoryFilters): number {
  const counted = new Set<RepositoryFilterField>(
    ACTIVE_FIELDS.filter((field) => isActiveField(filters, field)),
  );

  for (const [from, to] of [
    ['receivedFrom', 'receivedTo'],
    ['activityFrom', 'activityTo'],
  ] as const) {
    if (!counted.has(from) && !counted.has(to)) continue;
    counted.delete(from);
    counted.delete(to);
    counted.add(from);
  }

  return counted.size;
}

/** The panel starts open only when the URL already carries filters (§2). */
export function panelStartsOpen(filters: RepositoryFilters): boolean {
  return hasActiveFilters(filters);
}

/** Clear keeps the sort and the direction; the scope goes back to approved. */
export function clearedFilters(filters: RepositoryFilters): RepositoryFilters {
  return { ...DEFAULT_REPOSITORY_FILTERS, sort: filters.sort, dir: filters.dir };
}

export function repositoryQueryFor(filters: RepositoryFilters): RepositoryQuery {
  return {
    q: filters.q || undefined,
    tracking: filters.tracking || undefined,
    title: filters.title || undefined,
    type: filters.type || undefined,
    classification: filters.classification || undefined,
    campus: filters.campusId || undefined,
    college: filters.collegeId || undefined,
    term: filters.termId || undefined,
    department: filters.department || undefined,
    office: filters.office || undefined,
    level: filters.level || undefined,
    sdg: filters.sdgIds.length > 0 ? filters.sdgIds : undefined,
    status: filters.status,
    receivedFrom: filters.receivedFrom || undefined,
    receivedTo: filters.receivedTo || undefined,
    activityFrom: filters.activityFrom || undefined,
    activityTo: filters.activityTo || undefined,
    pic: filters.pic || undefined,
    sort: filters.sort,
    dir: filters.dir,
    page: filters.page,
    size: REPOSITORY_PAGE_SIZE,
  };
}

export type RepositoryFilterErrors = {
  received?: string;
  activity?: string;
};

/** An inverted range blocks Apply; the field itself carries the message (§2). */
export function validateFilters(filters: RepositoryFilters): RepositoryFilterErrors {
  const errors: RepositoryFilterErrors = {};

  if (filters.receivedFrom && filters.receivedTo && filters.receivedTo < filters.receivedFrom) {
    errors.received = 'The received-to date must be on or after the received-from date.';
  }
  if (filters.activityFrom && filters.activityTo && filters.activityTo < filters.activityFrom) {
    errors.activity = 'The activity-to date must be on or after the activity-from date.';
  }

  return errors;
}

export function hasErrors(errors: RepositoryFilterErrors): boolean {
  return Boolean(errors.received || errors.activity);
}

/** Received and Title sort; a new header starts in its natural direction. */
export function toggledSort(
  filters: RepositoryFilters,
  field: RepositorySortField,
): Partial<RepositoryFilters> {
  if (filters.sort !== field) return { sort: field, dir: defaultDirectionFor(field) };
  return { dir: filters.dir === 'asc' ? 'desc' : 'asc' };
}

export function sortDirectionFor(
  filters: RepositoryFilters,
  field: RepositorySortField,
): 'ascending' | 'descending' | 'none' {
  if (filters.sort !== field) return 'none';
  return filters.dir === 'asc' ? 'ascending' : 'descending';
}

import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  clearedFilters,
  hasActiveFilters,
  panelStartsOpen,
  repositoryQueryFor,
  sortDirectionFor,
  toggledSort,
  validateFilters,
} from './repository-filter-scope';
import {
  DEFAULT_REPOSITORY_FILTERS,
  exportHref,
  filtersEqual,
  filtersFromParams,
  filtersToParams,
  repositoryHref,
  updateFilters,
} from './repository-filters';

describe('repository URL state', () => {
  it('defaults to every approved report, newest received first', () => {
    const filters = filtersFromParams(new URLSearchParams(''));

    expect(filters).toEqual(DEFAULT_REPOSITORY_FILTERS);
    expect(filters.status).toBe('APPROVED');
    expect(filters.sort).toBe('received');
    expect(filters.dir).toBe('desc');
  });

  it('ignores values it does not recognise instead of inventing a filter', () => {
    const filters = filtersFromParams(
      new URLSearchParams('type=NOT_A_TYPE&status=DRAFT&level=PHD&sort=updated&page=0'),
    );

    expect(filters.type).toBe('');
    expect(filters.status).toBe('APPROVED');
    expect(filters.level).toBe('');
    expect(filters.sort).toBe('received');
    expect(filters.page).toBe(1);
  });

  it('reads the example URL from the spec', () => {
    const filters = filtersFromParams(
      new URLSearchParams('q=cleanup&type=OFF_CAMPUS&status=APPROVED&page=2'),
    );

    expect(filters.q).toBe('cleanup');
    expect(filters.type).toBe('OFF_CAMPUS');
    expect(filters.page).toBe(2);
  });

  it('round-trips only what differs from the default', () => {
    const filters = {
      ...DEFAULT_REPOSITORY_FILTERS,
      q: 'cleanup',
      type: 'OFF_CAMPUS' as const,
      sdgIds: ['s4', 's13'],
      status: 'SUBMITTED' as const,
      sort: 'title' as const,
      dir: 'desc' as const,
      page: 2,
    };

    expect(filtersToParams(DEFAULT_REPOSITORY_FILTERS)).toBe('');
    expect(filtersToParams(filters)).toContain('q=cleanup');
    expect(filtersToParams(filters)).toContain('sdg=s4%2Cs13');
    expect(filtersToParams(filters)).toContain('dir=desc');
    expect(filtersFromParams(new URLSearchParams(filtersToParams(filters)))).toEqual(filters);
  });

  it('carries the AR No. filter as the reference parameter', () => {
    const filters = filtersFromParams(new URLSearchParams('reference=AR+No.+0014'));

    expect(filters.reference).toBe('AR No. 0014');
    expect(filtersToParams(filters)).toBe('reference=AR+No.+0014');
    expect(repositoryQueryFor(filters).reference).toBe('AR No. 0014');
  });

  it('restarts at page 1 when the scope changes and keeps it when paging', () => {
    const current = { ...DEFAULT_REPOSITORY_FILTERS, page: 3 };

    expect(updateFilters(current, { q: 'museum' }).page).toBe(1);
    expect(updateFilters(current, { status: 'SUBMITTED' }).page).toBe(1);
    expect(updateFilters(current, { sort: 'title' }).page).toBe(1);
    expect(updateFilters(current, { page: 2 }).page).toBe(2);
  });

  it('compares every field, so an unchanged URL never reloads the results', () => {
    const a = { ...DEFAULT_REPOSITORY_FILTERS };

    expect(filtersEqual(a, { ...a })).toBe(true);
    expect(filtersEqual(a, { ...a, q: 'x' })).toBe(false);
    expect(filtersEqual(a, { ...a, sdgIds: ['s1'] })).toBe(false);
    expect(filtersEqual(a, { ...a, page: 2 })).toBe(false);
  });

  it('builds its own href with only the non-default filters', () => {
    expect(repositoryHref(DEFAULT_REPOSITORY_FILTERS)).toBe('/search');
    expect(repositoryHref({ ...DEFAULT_REPOSITORY_FILTERS, type: 'IN_CAMPUS' })).toBe(
      '/search?type=IN_CAMPUS',
    );
  });

  it('adds the open report to the href so the pane is URL state', () => {
    expect(repositoryHref(DEFAULT_REPOSITORY_FILTERS, 'r1')).toBe('/search?report=r1');
    expect(repositoryHref({ ...DEFAULT_REPOSITORY_FILTERS, type: 'IN_CAMPUS' }, 'r1')).toBe(
      '/search?type=IN_CAMPUS&report=r1',
    );
  });
});

describe('active scope', () => {
  it('treats the default status as the scope, not as an active filter', () => {
    expect(hasActiveFilters(DEFAULT_REPOSITORY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_REPOSITORY_FILTERS, status: 'SUBMITTED' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_REPOSITORY_FILTERS, q: 'x' })).toBe(false);
    expect(panelStartsOpen(DEFAULT_REPOSITORY_FILTERS)).toBe(false);
    expect(panelStartsOpen({ ...DEFAULT_REPOSITORY_FILTERS, type: 'IN_CAMPUS' })).toBe(true);
  });

  it('counts a date range once and drops the status when it is the default', () => {
    expect(activeFilterCount(DEFAULT_REPOSITORY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        ...DEFAULT_REPOSITORY_FILTERS,
        receivedFrom: '2026-03-01',
        receivedTo: '2026-03-31',
      }),
    ).toBe(1);
    expect(
      activeFilterCount({
        ...DEFAULT_REPOSITORY_FILTERS,
        type: 'OFF_CAMPUS',
        status: 'SUBMITTED',
        pic: 'A. Cruz',
      }),
    ).toBe(3);
  });

  it('clears filters but keeps the sort and direction', () => {
    const cleared = clearedFilters({
      ...DEFAULT_REPOSITORY_FILTERS,
      q: 'cleanup',
      type: 'OFF_CAMPUS',
      sort: 'title',
      dir: 'desc',
      page: 4,
    });

    expect(cleared).toEqual({ ...DEFAULT_REPOSITORY_FILTERS, sort: 'title', dir: 'desc' });
    expect(repositoryHref(cleared)).toBe('/search?sort=title&dir=desc');
  });

  it('maps to the API query without empty values', () => {
    expect(repositoryQueryFor(DEFAULT_REPOSITORY_FILTERS)).toEqual({
      q: undefined,
      reference: undefined,
      title: undefined,
      type: undefined,
      classification: undefined,
      campus: undefined,
      college: undefined,
      term: undefined,
      department: undefined,
      office: undefined,
      level: undefined,
      sdg: undefined,
      status: 'APPROVED',
      receivedFrom: undefined,
      receivedTo: undefined,
      activityFrom: undefined,
      activityTo: undefined,
      pic: undefined,
      sort: 'received',
      dir: 'desc',
      page: 1,
      size: 25,
    });
  });

  it('hands the current filters to exports, without the page', () => {
    const filters = {
      ...DEFAULT_REPOSITORY_FILTERS,
      q: 'cleanup',
      type: 'OFF_CAMPUS' as const,
      page: 3,
    };

    expect(exportHref(filters)).toBe('/exports?q=cleanup&type=OFF_CAMPUS');
    expect(exportHref(DEFAULT_REPOSITORY_FILTERS)).toBe('/exports');
  });
});

describe('sorting', () => {
  it('starts a new header in its natural direction and toggles the current one', () => {
    expect(toggledSort(DEFAULT_REPOSITORY_FILTERS, 'title')).toEqual({ sort: 'title', dir: 'asc' });
    expect(
      toggledSort({ ...DEFAULT_REPOSITORY_FILTERS, sort: 'title', dir: 'asc' }, 'title'),
    ).toEqual({ dir: 'desc' });
  });

  it('reports the sort state for the table headers', () => {
    expect(sortDirectionFor(DEFAULT_REPOSITORY_FILTERS, 'received')).toBe('descending');
    expect(sortDirectionFor(DEFAULT_REPOSITORY_FILTERS, 'title')).toBe('none');
    expect(
      sortDirectionFor({ ...DEFAULT_REPOSITORY_FILTERS, sort: 'title', dir: 'asc' }, 'title'),
    ).toBe('ascending');
  });
});

describe('filter validation', () => {
  it('blocks an inverted date range', () => {
    expect(
      validateFilters({
        ...DEFAULT_REPOSITORY_FILTERS,
        receivedFrom: '2026-03-31',
        receivedTo: '2026-03-01',
        activityFrom: '2026-04-02',
        activityTo: '2026-04-01',
      }),
    ).toEqual({
      received: 'The received-to date must be on or after the received-from date.',
      activity: 'The activity-to date must be on or after the activity-from date.',
    });
  });

  it('accepts an open-ended or equal range', () => {
    expect(validateFilters({ ...DEFAULT_REPOSITORY_FILTERS, receivedFrom: '2026-03-01' })).toEqual(
      {},
    );
    expect(
      validateFilters({
        ...DEFAULT_REPOSITORY_FILTERS,
        receivedFrom: '2026-03-01',
        receivedTo: '2026-03-01',
      }),
    ).toEqual({});
  });
});

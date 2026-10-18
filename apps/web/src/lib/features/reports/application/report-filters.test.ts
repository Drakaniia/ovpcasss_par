import type { ReportListFacets } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REPORT_FILTERS,
  activeChips,
  activeFilterCount,
  clearedFilters,
  filtersEqual,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  removedFilter,
  updateFilters,
  type ReportFilters,
} from './report-filters';

const FACETS: ReportListFacets = {
  campuses: [
    { id: 'c1', label: 'Main Campus', isActive: true },
    { id: 'c2', label: 'North Campus', isActive: false },
  ],
  terms: [{ id: 't1', label: '2025-2026 · 1st', isActive: true }],
};

describe('filtersFromParams', () => {
  it('defaults to All, updated descending, page 1, 25 rows', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_REPORT_FILTERS);
  });

  it('restores a shared view', () => {
    const filters = filtersFromParams(
      new URLSearchParams(
        'tab=returned&type=OFF_CAMPUS&campus=c1&term=t1&from=2026-03-01&to=2026-03-31&q=cleanup&page=2&size=50',
      ),
    );

    expect(filters).toMatchObject({
      tab: 'returned',
      type: 'OFF_CAMPUS',
      campusId: 'c1',
      termId: 't1',
      from: '2026-03-01',
      to: '2026-03-31',
      q: 'cleanup',
      page: 2,
      pageSize: 50,
    });
  });

  it('falls back on unknown values instead of inventing state', () => {
    const filters = filtersFromParams(
      new URLSearchParams('tab=nope&type=CHEF&sort=title&dir=up&page=0&size=99&from=march'),
    );

    expect(filters).toEqual(DEFAULT_REPORT_FILTERS);
  });

  it('starts a new sort field in its natural direction', () => {
    expect(filtersFromParams(new URLSearchParams('sort=status')).dir).toBe('asc');
    expect(filtersFromParams(new URLSearchParams('sort=updated')).dir).toBe('desc');
    expect(filtersFromParams(new URLSearchParams('sort=status&dir=desc')).dir).toBe('desc');
  });
});

describe('filtersToParams', () => {
  it('round-trips a shared view', () => {
    const filters = filtersFromParams(
      new URLSearchParams('tab=drafts&campus=c1&q=cleanup&sort=status&dir=desc&page=3&size=100'),
    );

    expect(filtersFromParams(new URLSearchParams(filtersToParams(filters)))).toEqual(filters);
  });

  it('omits defaults and keeps a non-default direction explicit', () => {
    expect(filtersToParams(DEFAULT_REPORT_FILTERS)).toBe('');
    expect(filtersToParams({ ...DEFAULT_REPORT_FILTERS, dir: 'asc' })).toBe('dir=asc');
    expect(filtersToParams({ ...DEFAULT_REPORT_FILTERS, sort: 'status', dir: 'desc' })).toBe(
      'sort=status&dir=desc',
    );
  });
});

describe('filtersToQuery', () => {
  it('drops empty filters but keeps sort and paging', () => {
    expect(filtersToQuery(DEFAULT_REPORT_FILTERS)).toEqual({
      tab: 'all',
      type: undefined,
      campus: undefined,
      term: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
      sort: 'updated',
      dir: 'desc',
      page: 1,
      size: 25,
    });
  });
});

describe('updateFilters', () => {
  const scoped: ReportFilters = {
    ...DEFAULT_REPORT_FILTERS,
    type: 'IN_CAMPUS',
    campusId: 'c1',
    page: 3,
  };

  it('keeps filters when the tab changes and restarts at page 1', () => {
    const next = updateFilters(scoped, { tab: 'returned' });

    expect(next).toMatchObject({ tab: 'returned', type: 'IN_CAMPUS', campusId: 'c1', page: 1 });
  });

  it('restarts at page 1 for every filter change', () => {
    for (const patch of [
      { type: 'OFF_CAMPUS' as const },
      { campusId: '' },
      { termId: 't1' },
      { from: '2026-03-01' },
      { to: '2026-03-31' },
      { q: 'cleanup' },
      { pageSize: 100 as const },
    ]) {
      expect(updateFilters(scoped, patch).page).toBe(1);
    }
  });

  it('keeps the page for sorting and paging', () => {
    expect(updateFilters(scoped, { page: 4 }).page).toBe(4);
    expect(updateFilters(scoped, { sort: 'status' }).page).toBe(3);
  });
});

describe('clearedFilters', () => {
  it('clears the filters but keeps the tab, sort, and row count', () => {
    const cleared = clearedFilters({
      ...DEFAULT_REPORT_FILTERS,
      tab: 'drafts',
      type: 'IN_CAMPUS',
      q: 'cleanup',
      sort: 'status',
      dir: 'desc',
      pageSize: 100,
      page: 4,
    });

    expect(cleared).toMatchObject({
      tab: 'drafts',
      sort: 'status',
      dir: 'desc',
      pageSize: 100,
      type: '',
      q: '',
      page: 1,
    });
    expect(filtersEqual(cleared, { ...cleared, page: 2 })).toBe(false);
  });
});

describe('filter chips', () => {
  it('labels every active filter from the reference data', () => {
    const chips = activeChips(
      {
        ...DEFAULT_REPORT_FILTERS,
        type: 'OFF_CAMPUS',
        campusId: 'c1',
        termId: 't1',
        from: '2026-03-01',
        to: '2026-03-31',
      },
      FACETS,
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      'Off-campus',
      'Main Campus',
      '2025-2026 · 1st',
      'From 01 Mar 2026',
      'To 31 Mar 2026',
    ]);
    expect(chips.some((chip) => chip.inactive)).toBe(false);
  });

  it('keeps a deactivated value visible and marks it inactive', () => {
    const chips = activeChips({ ...DEFAULT_REPORT_FILTERS, campusId: 'c2' }, FACETS);

    expect(chips[0]).toMatchObject({ id: 'campus', label: 'North Campus', inactive: true });
  });

  it('keeps an unresolvable saved value as an inactive chip', () => {
    const chips = activeChips({ ...DEFAULT_REPORT_FILTERS, termId: 'gone' }, FACETS);

    expect(chips[0]).toMatchObject({ id: 'term', label: 'gone', inactive: true });
  });

  it('counts the date range once in the Filters button', () => {
    expect(activeFilterCount({ ...DEFAULT_REPORT_FILTERS, from: '2026-03-01' })).toBe(1);
    expect(
      activeFilterCount({
        ...DEFAULT_REPORT_FILTERS,
        type: 'IN_CAMPUS',
        campusId: 'c1',
        from: '2026-03-01',
        to: '2026-03-02',
      }),
    ).toBe(3);
  });

  it('removes one filter at a time', () => {
    expect(removedFilter('campus')).toEqual({ campusId: '' });
    expect(removedFilter('from')).toEqual({ from: '' });
    expect(removedFilter('type')).toEqual({ type: '' });
  });
});

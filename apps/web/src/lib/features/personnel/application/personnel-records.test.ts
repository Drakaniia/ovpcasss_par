import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PERSONNEL_FILTERS,
  hasPersonnelFilters,
  personnelFiltersFromParams,
  personnelFiltersToParams,
  personnelFiltersToQuery,
  updatePersonnelFilters,
} from './personnel-records';

describe('personnelFiltersToQuery', () => {
  it('asks for the whole register, archived rows included', () => {
    expect(personnelFiltersToQuery(DEFAULT_PERSONNEL_FILTERS)).toEqual({
      tab: 'all',
      archived: 'all',
      from: undefined,
      to: undefined,
      q: undefined,
      sort: 'updated',
      dir: 'desc',
      page: 1,
      size: 25,
    });
  });

  it('passes the chosen status as the register tab', () => {
    const query = personnelFiltersToQuery({
      ...DEFAULT_PERSONNEL_FILTERS,
      status: 'returned',
    });

    expect(query.tab).toBe('returned');
  });

  it('carries the activity dates and the search term', () => {
    const query = personnelFiltersToQuery({
      ...DEFAULT_PERSONNEL_FILTERS,
      from: '2026-01-01',
      to: '2026-06-30',
      q: 'AR No. 0001',
      page: 2,
      pageSize: 50,
    });

    expect(query).toMatchObject({
      from: '2026-01-01',
      to: '2026-06-30',
      q: 'AR No. 0001',
      page: 2,
      size: 50,
    });
  });
});

describe('updatePersonnelFilters', () => {
  it('restarts at the first page when the scope changes', () => {
    const current = { ...DEFAULT_PERSONNEL_FILTERS, page: 4 };

    expect(updatePersonnelFilters(current, { status: 'approved' }).page).toBe(1);
    expect(updatePersonnelFilters(current, { q: 'cleanup' }).page).toBe(1);
    expect(updatePersonnelFilters(current, { from: '2026-01-01' }).page).toBe(1);
    expect(updatePersonnelFilters(current, { pageSize: 100 }).page).toBe(1);
  });

  it('keeps the page it was asked for', () => {
    const current = { ...DEFAULT_PERSONNEL_FILTERS, page: 2 };

    expect(updatePersonnelFilters(current, { page: 3 }).page).toBe(3);
  });
});

describe('URL state', () => {
  it('round-trips every filter', () => {
    const filters = {
      status: 'returned' as const,
      from: '2026-01-01',
      to: '2026-06-30',
      q: 'cleanup',
      page: 3,
      pageSize: 50 as const,
    };

    const params = personnelFiltersToParams(filters);

    expect(personnelFiltersFromParams(new URLSearchParams(params))).toEqual(filters);
  });

  it('keeps the default state out of the URL', () => {
    expect(personnelFiltersToParams(DEFAULT_PERSONNEL_FILTERS)).toBe('');
  });

  it('falls back to the defaults for a hand-edited URL', () => {
    const parsed = personnelFiltersFromParams(
      new URLSearchParams('tab=nonsense&page=-2&size=7&from=soon&q='),
    );

    expect(parsed).toEqual(DEFAULT_PERSONNEL_FILTERS);
  });
});

describe('hasPersonnelFilters', () => {
  it('reports whether anything narrows the list', () => {
    expect(hasPersonnelFilters(DEFAULT_PERSONNEL_FILTERS)).toBe(false);
    expect(hasPersonnelFilters({ ...DEFAULT_PERSONNEL_FILTERS, q: 'a' })).toBe(true);
    expect(hasPersonnelFilters({ ...DEFAULT_PERSONNEL_FILTERS, status: 'pending' })).toBe(true);
    expect(hasPersonnelFilters({ ...DEFAULT_PERSONNEL_FILTERS, to: '2026-06-30' })).toBe(true);
  });
});

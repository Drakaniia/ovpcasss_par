import { describe, expect, it } from 'vitest';

import {
  clearedQueueFilters,
  DEFAULT_QUEUE_FILTERS,
  hasQueueFilters,
  queueFiltersEqual,
  queueFiltersFromParams,
  queueFiltersToParams,
  queueHref,
  queuePath,
  queueQueryFor,
  updateQueueFilters,
} from './queue-filters';

describe('queue URL state', () => {
  it('defaults to the backlog order on the first page', () => {
    const filters = queueFiltersFromParams(new URLSearchParams(''));

    expect(filters).toEqual(DEFAULT_QUEUE_FILTERS);
    expect(filters.sort).toBe('oldest');
  });

  it('ignores values it does not recognise instead of inventing a filter', () => {
    const filters = queueFiltersFromParams(
      new URLSearchParams('type=NOT_A_TYPE&sort=newest-first&page=0'),
    );

    expect(filters.type).toBe('');
    expect(filters.sort).toBe('oldest');
    expect(filters.page).toBe(1);
  });

  it('round-trips only what differs from the default', () => {
    const filters = {
      type: 'OFF_CAMPUS' as const,
      campusId: 'c1',
      collegeId: 'un1',
      sort: 'age' as const,
      page: 2,
    };

    expect(queueFiltersToParams(filters)).toBe(
      'type=OFF_CAMPUS&campus=c1&college=un1&sort=age&page=2',
    );
    expect(queueFiltersToParams(DEFAULT_QUEUE_FILTERS)).toBe('');
    expect(queueFiltersFromParams(new URLSearchParams(queueFiltersToParams(filters)))).toEqual(
      filters,
    );
  });

  it('restarts at page 1 when the scope changes', () => {
    const current = { ...DEFAULT_QUEUE_FILTERS, page: 3 };

    expect(updateQueueFilters(current, { type: 'IN_CAMPUS' }).page).toBe(1);
    expect(updateQueueFilters(current, { campusId: 'c2' }).page).toBe(1);
    expect(updateQueueFilters(current, { sort: 'newest' }).page).toBe(1);
    expect(updateQueueFilters(current, { page: 2 }).page).toBe(2);
  });

  it('keeps the sort when the filters are cleared', () => {
    const cleared = clearedQueueFilters({
      type: 'IN_CAMPUS',
      campusId: 'c1',
      collegeId: 'un1',
      sort: 'newest',
      page: 4,
    });

    expect(cleared).toEqual({ ...DEFAULT_QUEUE_FILTERS, sort: 'newest' });
    expect(hasQueueFilters(cleared)).toBe(false);
  });

  it('treats a deactivated campus or college as an active filter', () => {
    expect(hasQueueFilters({ ...DEFAULT_QUEUE_FILTERS, campusId: 'gone' })).toBe(true);
    expect(hasQueueFilters({ ...DEFAULT_QUEUE_FILTERS, collegeId: 'gone' })).toBe(true);
  });

  it('compares every field, so an unchanged URL never reloads the queue', () => {
    const a = { ...DEFAULT_QUEUE_FILTERS };
    expect(queueFiltersEqual(a, { ...a })).toBe(true);
    expect(queueFiltersEqual(a, { ...a, page: 2 })).toBe(false);
    expect(queueFiltersEqual(a, { ...a, sort: 'age' })).toBe(false);
  });

  it('maps to the API query without empty strings', () => {
    expect(queueQueryFor(DEFAULT_QUEUE_FILTERS)).toEqual({
      type: undefined,
      campus: undefined,
      college: undefined,
      sort: 'oldest',
      page: 1,
      size: 25,
    });
  });

  it('builds queue and detail hrefs from the same filters', () => {
    expect(queueHref(queuePath('review'), DEFAULT_QUEUE_FILTERS)).toBe('/review');
    expect(queuePath('approval', 'r1')).toBe('/approval/r1');
    expect(queueHref('/review', 'type=IN_CAMPUS')).toBe('/review?type=IN_CAMPUS');
  });
});

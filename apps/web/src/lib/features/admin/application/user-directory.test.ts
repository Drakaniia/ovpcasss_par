import type { AdminUser } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_USER_FILTERS,
  PENDING_QUEUE_PATCH,
  clearedFilters,
  disableConfirmation,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  pageWindow,
  showingRange,
  updateFilters,
  userActionStates,
  type UserFilters,
} from './user-directory';

const user = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u1',
  fullName: 'M. Santos',
  email: 'ms@university.edu',
  role: 'SUBMITTER',
  status: 'PENDING_ROLE',
  campusUnit: 'Main',
  contactNumber: null,
  registeredAt: '2026-03-14T00:00:00.000Z',
  emailVerifiedAt: '2026-03-14T00:00:00.000Z',
  ...overrides,
});

describe('filtersFromParams', () => {
  it('defaults to every account, oldest first, 25 rows', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_USER_FILTERS);
    expect(DEFAULT_USER_FILTERS.status).toBe('ALL');
    expect(DEFAULT_USER_FILTERS.sort).toBe('registered');
    expect(DEFAULT_USER_FILTERS.dir).toBe('asc');
  });

  it('restores a shared view', () => {
    const filters = filtersFromParams(
      new URLSearchParams('status=PENDING_ROLE&role=REVIEWER&q=santos'),
    );

    expect(filters).toMatchObject({ status: 'PENDING_ROLE', role: 'REVIEWER', q: 'santos' });
  });

  it('falls back on unknown values instead of inventing state', () => {
    const filters = filtersFromParams(
      new URLSearchParams('status=NOPE&role=CHEF&sort=email&dir=up&page=0&pageSize=99'),
    );

    expect(filters).toEqual(DEFAULT_USER_FILTERS);
  });

  it('accepts the explicit All status used by Clear filters', () => {
    const filters = filtersFromParams(new URLSearchParams('status=ALL&page=2&pageSize=50'));

    expect(filters.status).toBe('ALL');
    expect(filters.page).toBe(2);
    expect(filters.pageSize).toBe(50);
  });
});

describe('filtersToParams', () => {
  it('round-trips a shared view', () => {
    const filters = filtersFromParams(
      new URLSearchParams('status=PENDING_ROLE&role=REVIEWER&q=santos'),
    );

    expect(filtersFromParams(new URLSearchParams(filtersToParams(filters)))).toEqual(filters);
  });

  it('keeps the meaningful default explicit and omits the rest', () => {
    expect(filtersToParams(DEFAULT_USER_FILTERS)).toBe('status=ALL');
  });

  it('writes only non-default sort, page, and size', () => {
    const filters: UserFilters = {
      ...DEFAULT_USER_FILTERS,
      status: 'ALL',
      sort: 'name',
      dir: 'desc',
      page: 3,
      pageSize: 100,
    };

    expect(filtersToParams(filters)).toBe('status=ALL&sort=name&dir=desc&page=3&pageSize=100');
  });
});

describe('filtersToQuery', () => {
  it('omits All and empty values but keeps sort and paging', () => {
    expect(filtersToQuery(DEFAULT_USER_FILTERS)).toEqual({
      q: undefined,
      role: undefined,
      status: undefined,
      sort: 'registered',
      dir: 'asc',
      page: 1,
      pageSize: 25,
    });
  });
});

describe('pending queue', () => {
  it('opens the pending-role queue from any view', () => {
    const current: UserFilters = {
      ...DEFAULT_USER_FILTERS,
      q: 'santos',
      role: 'REVIEWER',
      page: 4,
    };

    const next = updateFilters(current, PENDING_QUEUE_PATCH);

    expect(next).toMatchObject({ q: '', role: 'ALL', status: 'PENDING_ROLE', page: 1 });
  });

  it('changes the default view, so the button is never a no-op', () => {
    expect(updateFilters(DEFAULT_USER_FILTERS, PENDING_QUEUE_PATCH)).not.toEqual(
      DEFAULT_USER_FILTERS,
    );
  });
});

describe('updateFilters', () => {
  it('restarts at page 1 when the scope changes', () => {
    const current = { ...DEFAULT_USER_FILTERS, page: 3 };

    expect(updateFilters(current, { role: 'REVIEWER' }).page).toBe(1);
    expect(updateFilters(current, { status: 'DISABLED' }).page).toBe(1);
    expect(updateFilters(current, { q: 'santos' }).page).toBe(1);
    expect(updateFilters(current, { pageSize: 100 }).page).toBe(1);
  });

  it('keeps the page when only pagination changes', () => {
    const current = { ...DEFAULT_USER_FILTERS, page: 2 };

    expect(updateFilters(current, { page: 4 }).page).toBe(4);
    expect(updateFilters(current, { sort: 'name' }).page).toBe(2);
  });
});

describe('clearedFilters', () => {
  it('clears every filter rather than snapping back to the pending queue', () => {
    const cleared = clearedFilters({ ...DEFAULT_USER_FILTERS, q: 'x', role: 'ADMIN', page: 4 });

    expect(cleared).toMatchObject({ q: '', role: 'ALL', status: 'ALL', page: 1 });
  });
});

describe('pagination', () => {
  it('shows the visible range, never past the total', () => {
    expect(showingRange(1, 25, 84)).toEqual({ from: 1, to: 25 });
    expect(showingRange(4, 25, 84)).toEqual({ from: 76, to: 84 });
    expect(showingRange(1, 25, 0)).toEqual({ from: 0, to: 0 });
  });

  it('collapses long page lists around the current page', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 6, 7, 8, 9, 10]);
  });
});

describe('userActionStates', () => {
  it('offers Activate only when a role is assigned', () => {
    const pendingWithoutRole = userActionStates(user({ role: null }), false);

    expect(pendingWithoutRole.activate).toEqual({
      visible: true,
      enabled: false,
      reason: 'Assign a role first.',
    });
    expect(userActionStates(user(), false).activate.enabled).toBe(true);
  });

  it('offers Disable only for active accounts', () => {
    expect(userActionStates(user({ status: 'ACTIVE' }), false).disable.visible).toBe(true);
    expect(userActionStates(user({ status: 'PENDING_ROLE' }), false).disable.visible).toBe(false);
    expect(userActionStates(user({ status: 'DISABLED' }), false).disable.visible).toBe(false);
  });

  it('protects the signed-in admin with visible reasons', () => {
    const self = userActionStates(user({ status: 'ACTIVE' }), true);

    expect(self['assign-role']).toEqual({
      visible: true,
      enabled: false,
      reason: 'You cannot change your own role.',
    });
    expect(self.disable).toEqual({
      visible: true,
      enabled: false,
      reason: 'You cannot disable your own account.',
    });
    expect(self.activate.visible).toBe(false);
  });
});

describe('confirmations', () => {
  it('names the person and the consequence', () => {
    const disabled = disableConfirmation(user({ status: 'ACTIVE' }));

    expect(disabled.title).toBe('Disable M. Santos?');
    expect(disabled.description).toContain('M. Santos will no longer be able to sign in.');
    expect(disabled.description).toContain('Their reports and audit history are kept.');
  });
});

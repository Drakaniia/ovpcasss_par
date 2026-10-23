import { describe, expect, it } from 'vitest';

import {
  activeNavId,
  isTabActive,
  navItemsFor,
  sectionTabsFor,
  tabAttention,
  tabHref,
} from './navigation';

const labels = (role: Parameters<typeof navItemsFor>[0]) =>
  navItemsFor(role).map((item) => item.label);

describe('navItemsFor', () => {
  it('gives personnel Home only: no register, no repository', () => {
    expect(labels('PERSONNEL')).toEqual(['Home']);
  });

  it('gives admin every destination', () => {
    expect(labels('ADMIN')).toEqual(['Home', 'Reports', 'Repository', 'Admin']);
  });

  it('renders no destinations when signed out', () => {
    expect(labels(null)).toEqual([]);
  });
});

describe('activeNavId', () => {
  it('matches the section that owns the path', () => {
    expect(activeNavId('/')).toBe('home');
    expect(activeNavId('/reports/123/edit')).toBe('reports');
    expect(activeNavId('/search')).toBe('repository');
    expect(activeNavId('/exports')).toBe('repository');
    expect(activeNavId('/admin/audit')).toBe('admin');
  });

  it('ignores routes outside the shell', () => {
    expect(activeNavId('/login')).toBeNull();
    expect(activeNavId('/review/9')).toBeNull();
    expect(activeNavId('/approval')).toBeNull();
  });
});

describe('sectionTabsFor', () => {
  it('shows the office every report tab', () => {
    expect(sectionTabsFor('reports', 'ADMIN').map((tab) => tab.label)).toEqual([
      'All',
      'With personnel',
      'Submitted',
      'Returned',
      'Approved',
      'Archived',
    ]);
  });

  it('gives personnel no section tabs, since it has no sections', () => {
    expect(sectionTabsFor('reports', 'PERSONNEL')).toEqual([]);
  });

  it('shows repository and admin tabs', () => {
    expect(sectionTabsFor('repository', 'ADMIN').map((tab) => tab.label)).toEqual([
      'Search',
      'Exports',
    ]);
    expect(sectionTabsFor('repository', 'PERSONNEL')).toEqual([]);
    expect(sectionTabsFor('admin', 'ADMIN').map((tab) => tab.label)).toEqual([
      'Users',
      'Reference data',
      'Audit',
      'Email log',
    ]);
  });
});

describe('tabAttention', () => {
  const counts = { awaitingReview: 2, returned: 3, failedEmails: 1 };

  it('maps each count to the tab that names the work', () => {
    expect(tabAttention(sectionTabsFor('reports', 'ADMIN'), counts)).toEqual({
      '/reports?tab=submitted': 2,
      '/reports?tab=returned': 3,
    });
    expect(tabAttention(sectionTabsFor('admin', 'ADMIN'), counts)).toEqual({
      '/admin/emails': 1,
    });
  });

  it('omits zero counts and does not invent a review tab for personnel', () => {
    expect(
      tabAttention(sectionTabsFor('reports', 'PERSONNEL'), {
        awaitingReview: 5,
        returned: 0,
        failedEmails: 0,
      }),
    ).toEqual({});
  });
});

describe('tabHref', () => {
  it('keeps report filters when the tab changes and restarts at page 1', () => {
    expect(
      tabHref('/reports?tab=submitted', '?tab=all&type=OFF_CAMPUS&campus=c1&page=3&size=50'),
    ).toBe('/reports?tab=submitted&type=OFF_CAMPUS&campus=c1&size=50');
  });

  it('takes the All tab back to a clean path', () => {
    expect(tabHref('/reports', '?tab=submitted&q=cleanup&page=2')).toBe('/reports?q=cleanup');
  });

  it('leaves other sections unchanged when the URL has no filters', () => {
    expect(tabHref('/admin/users', '')).toBe('/admin/users');
    expect(tabHref('/search', '')).toBe('/search');
  });
});

describe('isTabActive', () => {
  it('requires both the path and the tab parameter to match', () => {
    expect(isTabActive('/reports', '/reports', '')).toBe(true);
    expect(isTabActive('/reports?tab=submitted', '/reports', '?tab=submitted')).toBe(true);
    expect(isTabActive('/reports', '/reports', '?tab=submitted')).toBe(false);
    expect(isTabActive('/reports?tab=submitted', '/search', '?tab=submitted')).toBe(false);
  });
});

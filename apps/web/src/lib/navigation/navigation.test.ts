import { describe, expect, it } from 'vitest';

import { activeNavId, isTabActive, navItemsFor, sectionTabsFor, tabHref } from './navigation';

const labels = (role: Parameters<typeof navItemsFor>[0]) =>
  navItemsFor(role).map((item) => item.label);

describe('navItemsFor', () => {
  it('gives a submitter only Home and Reports', () => {
    expect(labels('SUBMITTER')).toEqual(['Home', 'Reports']);
  });

  it('gives reviewers and approvers Queues and Repository', () => {
    expect(labels('REVIEWER')).toEqual(['Home', 'Reports', 'Queues', 'Repository']);
    expect(labels('APPROVER')).toEqual(['Home', 'Reports', 'Queues', 'Repository']);
  });

  it('does not give admin queues or review capability', () => {
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
    expect(activeNavId('/review/9')).toBe('queues');
    expect(activeNavId('/approval')).toBe('queues');
    expect(activeNavId('/search')).toBe('repository');
    expect(activeNavId('/exports')).toBe('repository');
    expect(activeNavId('/admin/audit')).toBe('admin');
  });

  it('ignores routes outside the shell', () => {
    expect(activeNavId('/login')).toBeNull();
  });
});

describe('sectionTabsFor', () => {
  it('shows the four report tabs', () => {
    expect(sectionTabsFor('reports', 'SUBMITTER')).toHaveLength(4);
  });

  it('filters queue tabs by role', () => {
    expect(sectionTabsFor('queues', 'REVIEWER').map((tab) => tab.label)).toEqual(['Review']);
    expect(sectionTabsFor('queues', 'APPROVER').map((tab) => tab.label)).toEqual(['Approval']);
    expect(sectionTabsFor('queues', 'ADMIN')).toEqual([]);
  });

  it('shows repository and admin tabs', () => {
    expect(sectionTabsFor('repository', 'ADMIN').map((tab) => tab.label)).toEqual([
      'Search',
      'Exports',
    ]);
    expect(sectionTabsFor('admin', 'ADMIN')).toHaveLength(3);
  });
});

describe('tabHref', () => {
  it('keeps report filters when the tab changes and restarts at page 1', () => {
    expect(
      tabHref('/reports?tab=drafts', '?tab=all&type=OFF_CAMPUS&campus=c1&page=3&size=50'),
    ).toBe('/reports?tab=drafts&type=OFF_CAMPUS&campus=c1&size=50');
  });

  it('takes the All tab back to a clean path', () => {
    expect(tabHref('/reports', '?tab=drafts&q=cleanup&page=2')).toBe('/reports?q=cleanup');
  });

  it('leaves other sections unchanged when the URL has no filters', () => {
    expect(tabHref('/admin/users', '')).toBe('/admin/users');
    expect(tabHref('/search', '')).toBe('/search');
  });
});

describe('isTabActive', () => {
  it('requires both the path and the tab parameter to match', () => {
    expect(isTabActive('/reports', '/reports', '')).toBe(true);
    expect(isTabActive('/reports?tab=drafts', '/reports', '?tab=drafts')).toBe(true);
    expect(isTabActive('/reports', '/reports', '?tab=drafts')).toBe(false);
    expect(isTabActive('/reports?tab=drafts', '/search', '?tab=drafts')).toBe(false);
  });
});

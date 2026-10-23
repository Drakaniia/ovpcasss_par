import { actsAs, type Role } from '@par/shared';

import { referenceDataHref } from '$lib/features/admin/application/reference-data';

/**
 * Role-filtered top navigation and section tabs (UI spec §5.1–§5.2). The office
 * owns every section; a personnel account gets Home, where the records that
 * name it are listed, and nothing else (spec 2026-10-23 §8.2).
 */
export type NavId = 'home' | 'reports' | 'repository' | 'admin';

export type NavItem = {
  id: NavId;
  label: string;
  href: string;
  roles: readonly Role[];
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  PERSONNEL: 'Personnel in charge',
};

const EVERY_ROLE: readonly Role[] = ['ADMIN', 'PERSONNEL'];

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Home', href: '/', roles: EVERY_ROLE },
  { id: 'reports', label: 'Reports', href: '/reports', roles: ['ADMIN'] },
  {
    id: 'repository',
    label: 'Repository',
    href: '/search',
    roles: ['ADMIN'],
  },
  { id: 'admin', label: 'Admin', href: '/admin/users', roles: ['ADMIN'] },
];

export function navItemsFor(role: Role | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.some((expected) => actsAs(role, expected)));
}

/** The repository is the office's; a personnel account reads from Home only. */
export function canSearchRepository(role: Role | null | undefined): boolean {
  return role === 'ADMIN';
}

export function activeNavId(pathname: string): NavId | null {
  if (pathname === '/') return 'home';
  if (pathname === '/reports' || pathname.startsWith('/reports/')) return 'reports';
  if (pathname === '/search' || pathname === '/exports') return 'repository';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return null;
}

export type TabAttention = 'review' | 'returned' | 'emailFailures';

export type SectionTab = {
  label: string;
  href: string;
  /** Which count marks this tab; absent means the tab never earns a dot. */
  attention?: TabAttention;
};

export type AttentionCounts = {
  awaitingReview: number;
  returned: number;
  failedEmails: number;
};

/** The dots to render, keyed by tab href; zero counts are omitted (phase 08 §3.2). */
export function tabAttention(
  tabs: readonly SectionTab[],
  counts: AttentionCounts,
): Record<string, number> {
  const dots: Record<string, number> = {};

  for (const tab of tabs) {
    if (!tab.attention) continue;

    const count =
      tab.attention === 'review'
        ? counts.awaitingReview
        : tab.attention === 'returned'
          ? counts.returned
          : counts.failedEmails;

    if (count > 0) dots[tab.href] = count;
  }

  return dots;
}

/**
 * Tabs render only inside a section and only when there is more than one
 * (shell anatomy, UI spec §5.3).
 */
export function sectionTabsFor(section: NavId | null, role: Role | null | undefined): SectionTab[] {
  if (!section) return [];

  switch (section) {
    case 'reports':
      return actsAs(role, 'ADMIN')
        ? [
            { label: 'All', href: '/reports' },
            { label: 'With personnel', href: '/reports?tab=pending' },
            { label: 'Submitted', href: '/reports?tab=submitted', attention: 'review' },
            { label: 'Returned', href: '/reports?tab=returned', attention: 'returned' },
            { label: 'Approved', href: '/reports?tab=approved' },
            { label: 'Archived', href: '/reports?archived=archived' },
          ]
        : [];
    case 'repository':
      return actsAs(role, 'ADMIN')
        ? [
            { label: 'Search', href: '/search' },
            { label: 'Exports', href: '/exports' },
          ]
        : [];
    case 'admin':
      return [
        { label: 'Users', href: '/admin/users' },
        { label: 'Reference data', href: referenceDataHref('campuses') },
        { label: 'Audit', href: '/admin/audit' },
        { label: 'Email log', href: '/admin/emails', attention: 'emailFailures' },
      ];
    default:
      return [];
  }
}

/**
 * Section tabs keep the section's filters (UI phase 05): switching tabs inside
 * Reports preserves the active filters and restarts at page 1.
 */
export function tabHref(href: string, currentSearch: string): string {
  const [path, query = ''] = href.split('?');
  const target = new URLSearchParams(query);
  const next = new URLSearchParams();
  const tab = target.get('tab');
  const archived = target.get('archived');

  if (tab) next.set('tab', tab);
  // Archived is a scope of its own: switching to a normal tab leaves it.
  if (archived) next.set('archived', archived);

  for (const [key, value] of new URLSearchParams(currentSearch)) {
    if (key === 'tab' || key === 'page' || key === 'archived') continue;
    next.set(key, value);
  }

  const search = next.toString();
  return search ? `${path}?${search}` : path;
}

/**
 * Compare a tab href with the current location, including its `tab` and
 * `archived` parameters: the Archived tab never lights up beside All.
 */
export function isTabActive(href: string, pathname: string, search: string): boolean {
  const [path, query = ''] = href.split('?');
  if (path !== pathname) return false;

  const target = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  const hrefArchived = target.get('archived') === 'archived';
  const currentArchived = current.get('archived') === 'archived';

  if (hrefArchived !== currentArchived) return false;
  return target.get('tab') === current.get('tab');
}

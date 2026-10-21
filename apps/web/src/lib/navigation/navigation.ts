import { actsAs, type Role } from '@par/shared';

/**
 * Role-filtered top navigation and section tabs (UI spec §5.1–§5.2).
 * Admin stands in for every role, so it reaches every destination.
 */
export type NavId = 'home' | 'reports' | 'queues' | 'repository' | 'admin';

export type NavItem = {
  id: NavId;
  label: string;
  href: string;
  roles: readonly Role[];
};

export const ROLE_LABELS: Record<Role, string> = {
  SUBMITTER: 'Submitter',
  REVIEWER: 'Reviewer',
  APPROVER: 'Approver',
  ADMIN: 'Administrator',
};

const EVERY_ROLE: readonly Role[] = ['SUBMITTER', 'REVIEWER', 'APPROVER', 'ADMIN'];

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Home', href: '/', roles: EVERY_ROLE },
  { id: 'reports', label: 'Reports', href: '/reports', roles: EVERY_ROLE },
  { id: 'queues', label: 'Queues', href: '/review', roles: ['REVIEWER', 'APPROVER'] },
  {
    id: 'repository',
    label: 'Repository',
    href: '/search',
    roles: ['REVIEWER', 'APPROVER', 'ADMIN'],
  },
  { id: 'admin', label: 'Admin', href: '/admin/users', roles: ['ADMIN'] },
];

export function navItemsFor(role: Role | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.some((expected) => actsAs(role, expected)));
}

export function canSearchRepository(role: Role | null | undefined): boolean {
  return actsAs(role, 'REVIEWER') || actsAs(role, 'APPROVER');
}

export function activeNavId(pathname: string): NavId | null {
  if (pathname === '/') return 'home';
  if (pathname === '/reports' || pathname.startsWith('/reports/')) return 'reports';
  if (pathname === '/review' || pathname.startsWith('/review/')) return 'queues';
  if (pathname === '/approval' || pathname.startsWith('/approval/')) return 'queues';
  if (pathname === '/search' || pathname === '/exports') return 'repository';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return null;
}

export type SectionTab = {
  label: string;
  href: string;
};

/**
 * Tabs render only inside a section and only when there is more than one
 * (shell anatomy, UI spec §5.3).
 */
export function sectionTabsFor(section: NavId | null, role: Role | null | undefined): SectionTab[] {
  if (!section) return [];

  switch (section) {
    case 'reports':
      return [
        { label: 'All', href: '/reports' },
        { label: 'Drafts', href: '/reports?tab=drafts' },
        { label: 'Returned', href: '/reports?tab=returned' },
        { label: 'Approved', href: '/reports?tab=approved' },
      ];
    case 'queues': {
      const tabs: SectionTab[] = [];
      if (actsAs(role, 'REVIEWER')) tabs.push({ label: 'Review', href: '/review' });
      if (actsAs(role, 'APPROVER')) tabs.push({ label: 'Approval', href: '/approval' });
      return tabs;
    }
    case 'repository':
      return [
        { label: 'Search', href: '/search' },
        { label: 'Exports', href: '/exports' },
      ];
    case 'admin':
      return [
        { label: 'Users', href: '/admin/users' },
        { label: 'Reference data', href: '/admin/reference-data' },
        { label: 'Import workbook', href: '/admin/import' },
        { label: 'Audit', href: '/admin/audit' },
        { label: 'Email log', href: '/admin/emails' },
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
  const tab = new URLSearchParams(query).get('tab');
  const next = new URLSearchParams();

  if (tab) next.set('tab', tab);

  for (const [key, value] of new URLSearchParams(currentSearch)) {
    if (key === 'tab' || key === 'page') continue;
    next.set(key, value);
  }

  const search = next.toString();
  return search ? `${path}?${search}` : path;
}

/** Compare a tab href with the current location, including its `tab` parameter. */
export function isTabActive(href: string, pathname: string, search: string): boolean {
  const [path, query = ''] = href.split('?');
  if (path !== pathname) return false;
  const hrefTab = new URLSearchParams(query).get('tab');
  const currentTab = new URLSearchParams(search).get('tab');
  return hrefTab === currentTab;
}

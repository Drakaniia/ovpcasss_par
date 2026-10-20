import type { ReportListItem, ReportStatus, Role } from '@par/shared';

import { navItemsFor, type NavId } from '$lib/navigation/navigation';

/**
 * Command palette entries (phase 12 §4). Pages are exactly the destinations the
 * role can reach; reports are whatever the scoped list endpoint returns, so the
 * palette can never offer more than the rest of the app.
 */
export type PalettePage = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export type PaletteReport = {
  id: string;
  href: string;
  trackingNumber: string | null;
  title: string;
  status: ReportStatus;
};

/** Reports stay out of the initial list until the query is worth a request. */
export const PALETTE_MIN_REPORT_QUERY = 2;

const PAGE_DESCRIPTIONS: Record<NavId, string> = {
  home: 'Your work inbox and what needs action',
  reports: 'Your reports, drafts, and returns',
  queues: 'Reports waiting for your review or approval',
  repository: 'Find stored reports and monitoring exports',
  admin: 'Users, reference data, and the audit log',
};

/** Profile and Notifications live in the avatar and bell menus, not the nav. */
const ACCOUNT_PAGES: readonly PalettePage[] = [
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    description: 'Your account details, password, and signature',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    description: 'Everything that happened on your reports',
  },
];

export function palettePages(role: Role | null | undefined): PalettePage[] {
  const pages = navItemsFor(role).map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    description: PAGE_DESCRIPTIONS[item.id],
  }));

  return [...pages, ...ACCOUNT_PAGES];
}

export function matchesQuery(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || text.toLowerCase().includes(needle);
}

export function filterPages(pages: readonly PalettePage[], query: string): PalettePage[] {
  return pages.filter((page) => matchesQuery(page.label, query));
}

export type MatchSegment = { text: string; match: boolean };

/** Splits a label around the first match so results can highlight it. */
export function matchSegments(text: string, query: string): MatchSegment[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [{ text, match: false }];

  const start = text.toLowerCase().indexOf(needle);
  if (start === -1) return [{ text, match: false }];

  const end = start + needle.length;
  const segments: MatchSegment[] = [];
  if (start > 0) segments.push({ text: text.slice(0, start), match: false });
  segments.push({ text: text.slice(start, end), match: true });
  if (end < text.length) segments.push({ text: text.slice(end), match: false });

  return segments;
}

/**
 * A draft has no tracking number yet and the facsimile is not useful, so it opens
 * the edit page — the same rule the reports table follows (UI spec §7.4).
 */
export function paletteReports(items: readonly ReportListItem[]): PaletteReport[] {
  return items.map((item) => ({
    id: item.id,
    href: item.status === 'DRAFT' ? `/reports/${item.id}/edit` : `/reports/${item.id}`,
    trackingNumber: item.trackingNumber,
    title: item.title,
    status: item.status,
  }));
}

import type { ReportListTab, Role } from '@par/shared';

import type { ReportRow } from './report-rows';

/**
 * My reports composition rules the page and its components share (UI spec
 * §7.4). Filters and rows live in `report-filters.ts` and `report-rows.ts`; this
 * module keeps the copy, empty states, and pagination.
 */

export * from './report-filters';
export * from './report-rows';

export type ReportEmptyState = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function emptyStateFor(
  tab: ReportListTab,
  options: { hasFilters: boolean; canCreate: boolean; clearHref: string },
): ReportEmptyState {
  if (options.hasFilters) {
    return {
      title: 'No reports match these filters.',
      description: 'Adjust the filters, or clear them to see every report.',
      action: { label: 'Clear filters', href: options.clearHref },
    };
  }

  const create = options.canCreate ? { label: 'New report', href: '/reports/new' } : undefined;

  switch (tab) {
    case 'drafts':
      return {
        title: 'No drafts.',
        description: 'Drafts you start are saved here until you submit them.',
        action: create,
      };
    case 'returned':
      return {
        title: 'Nothing returned.',
        description: 'Reports sent back to you for revision appear here.',
      };
    case 'approved':
      return {
        title: 'No approved reports yet.',
        description: 'Completed reports appear here.',
      };
    default:
      return {
        title: 'No reports yet.',
        description: 'Create a report to start the process.',
        action: create,
      };
  }
}

export function subtitleFor(role: Role | null | undefined): string {
  if (role === 'SUBMITTER') return 'Reports you submitted';
  if (role === 'REVIEWER' || role === 'APPROVER') return 'Reports you have handled';
  return 'All reports';
}

export type ConfirmationCopy = {
  title: string;
  description: string;
  confirmLabel: string;
};

export function deleteDraftConfirmation(row: ReportRow): ConfirmationCopy {
  return {
    title: `Delete draft “${row.title}”?`,
    description: 'The draft and its local copy are removed. This cannot be undone.',
    confirmLabel: 'Delete draft',
  };
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function showingRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, total) };
}

/** Page buttons with `null` standing in for an ellipsis. */
export function pageWindow(page: number, count: number): Array<number | null> {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);

  const start = Math.max(2, Math.min(page - 1, count - 4));
  const end = Math.min(count - 1, Math.max(page + 1, 5));
  const pages: Array<number | null> = [1];

  if (start > 2) pages.push(null);
  for (let current = start; current <= end; current += 1) pages.push(current);
  if (end < count - 1) pages.push(null);
  pages.push(count);

  return pages;
}

/** A deleted last row or a narrowed filter falls back to the last valid page. */
export function fallbackPage(total: number, pageSize: number, page: number): number {
  if (total <= 0) return 1;
  return Math.min(page, pageCountFor(total, pageSize));
}

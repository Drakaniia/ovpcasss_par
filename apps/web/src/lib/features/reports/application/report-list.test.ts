import type { ReportListItem } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  deleteDraftConfirmation,
  emptyStateFor,
  fallbackPage,
  pageWindow,
  showingRange,
  subtitleFor,
} from './report-list';
import { reportRowFromItem } from './report-rows';

const item = (overrides: Partial<ReportListItem> = {}): ReportListItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0001',
  title: 'Marine survey',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-12',
  updatedAt: '2026-03-14T01:12:00.000Z',
  ...overrides,
});

describe('empty states', () => {
  it('matches the copy table per tab', () => {
    const options = { hasFilters: false, canCreate: true, clearHref: '/reports' };

    expect(emptyStateFor('all', options)).toEqual({
      title: 'No reports yet.',
      description: 'Create a report to start the process.',
      action: { label: 'New report', href: '/reports/new' },
    });
    expect(emptyStateFor('drafts', options)).toMatchObject({ title: 'No drafts.' });
    expect(emptyStateFor('returned', options)).toEqual({
      title: 'Nothing returned.',
      description: 'Reports sent back to you for revision appear here.',
    });
    expect(emptyStateFor('approved', options).action).toBeUndefined();
  });

  it('drops the create action for read-only roles', () => {
    const empty = emptyStateFor('all', {
      hasFilters: false,
      canCreate: false,
      clearHref: '/reports',
    });

    expect(empty.action).toBeUndefined();
  });

  it('lets filtered-empty win over the tab copy and offers Clear filters', () => {
    const empty = emptyStateFor('returned', {
      hasFilters: true,
      canCreate: true,
      clearHref: '/reports?tab=returned',
    });

    expect(empty).toEqual({
      title: 'No reports match these filters.',
      description: 'Adjust the filters, or clear them to see every report.',
      action: { label: 'Clear filters', href: '/reports?tab=returned' },
    });
  });
});

describe('page header', () => {
  it('states what the table holds for each role', () => {
    expect(subtitleFor('SUBMITTER')).toBe('Reports you submitted');
    expect(subtitleFor('REVIEWER')).toBe('Reports you have handled');
    expect(subtitleFor('APPROVER')).toBe('Reports you have handled');
    expect(subtitleFor('ADMIN')).toBe('All reports');
  });
});

describe('delete confirmation', () => {
  it('names the draft and the consequence', () => {
    const row = reportRowFromItem(item({ status: 'DRAFT' }), {
      role: 'SUBMITTER',
      userId: 'u1',
    });

    expect(deleteDraftConfirmation(row)).toEqual({
      title: 'Delete draft “Marine survey”?',
      description: 'The draft and its local copy are removed. This cannot be undone.',
      confirmLabel: 'Delete draft',
    });
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

  it('falls back to the last valid page after a delete', () => {
    expect(fallbackPage(84, 25, 4)).toBe(4);
    expect(fallbackPage(76, 25, 4)).toBe(4);
    expect(fallbackPage(51, 25, 4)).toBe(3);
    expect(fallbackPage(0, 25, 3)).toBe(1);
  });
});

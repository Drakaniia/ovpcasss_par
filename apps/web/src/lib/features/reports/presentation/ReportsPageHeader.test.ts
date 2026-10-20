import type { ReportListFacets } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REPORT_FILTERS,
  activeChips,
  type ReportFilters,
} from '../application/report-list';
import ReportFilterBar from './ReportFilterBar.svelte';
import ReportsPageHeader from './ReportsPageHeader.svelte';
import ReportsPagination from './ReportsPagination.svelte';

const FACETS: ReportListFacets = {
  campuses: [
    { id: 'c1', label: 'Main Campus', isActive: true },
    { id: 'c2', label: 'North Campus', isActive: false },
  ],
  terms: [{ id: 't1', label: '2025-2026 · 1st', isActive: true }],
};

const noop = () => {};

describe('ReportsPageHeader', () => {
  it('names the table for each role and shows the one primary action to a submitter', () => {
    for (const [role, subtitle, primary] of [
      ['SUBMITTER', 'Reports you submitted', true],
      // The table only ever holds the caller's own reports, for every role.
      ['REVIEWER', 'Reports under your account', false],
      // Admin stands in for every role, so it can file a report too (spec §9).
      ['ADMIN', 'Reports you submitted', true],
    ] as const) {
      const html = render(ReportsPageHeader, { props: { role } }).body;

      expect(html).toContain('My reports');
      expect(html).toContain(subtitle);
      expect(html.includes('btn-primary')).toBe(primary);
    }
  });
});

describe('ReportFilterBar', () => {
  function renderBar(filters: ReportFilters) {
    return render(ReportFilterBar, {
      props: {
        filters,
        facets: FACETS,
        chips: activeChips(filters, FACETS),
        onchange: noop,
        onremove: noop,
        onclear: noop,
      },
    }).body;
  }

  it('renders the controls, reference values, and the removed state', () => {
    const filters: ReportFilters = {
      ...DEFAULT_REPORT_FILTERS,
      type: 'OFF_CAMPUS',
      campusId: 'c2',
    };
    const html = renderBar(filters);

    expect(html).toContain('Filter by type');
    expect(html).toContain('All types');
    expect(html).toContain('Off-campus');
    expect(html).toContain('All campuses');
    expect(html).toContain('Main Campus');
    expect(html).toContain('North Campus (inactive)');
    expect(html).toContain('for="filter-from"');
    expect(html).toContain('for="filter-to"');
    expect(html).toContain('aria-label="Choose activity date from"');
    expect(html).toContain('aria-label="Choose activity date to"');
    expect(html).toContain('Filters (2)');
    expect(html).toContain('data-search-field');
  });

  it('renders removable chips, marks an inactive value, and offers Clear all', () => {
    const html = renderBar({ ...DEFAULT_REPORT_FILTERS, campusId: 'c2' });

    expect(html).toContain('aria-label="Remove filter: North Campus"');
    expect(html).toContain('Inactive');
    expect(html).toContain('Clear all');
  });

  it('shows no chips when no filter is active', () => {
    const html = renderBar(DEFAULT_REPORT_FILTERS);

    expect(html).not.toContain('Clear all');
    expect(html).not.toContain('Remove filter');
  });
});

describe('ReportsPagination', () => {
  it('states the visible range, offers 25/50/100, and marks the current page', () => {
    const html = render(ReportsPagination, {
      props: {
        total: 84,
        page: 2,
        pageSize: 25,
        onpage: noop,
        onpagesize: noop,
      },
    }).body;

    expect(html).toContain('Showing 26–50 of 84');
    expect(html).toContain('Rows per page');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Page 4');
  });
});

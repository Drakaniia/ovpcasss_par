import type { ReportListItem, ReportListResponse } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PERSONNEL_FILTERS } from '../application/personnel-records';
import PersonnelRecords from './PersonnelRecords.svelte';

const ITEM: ReportListItem = {
  id: 'report-1',
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'PENDING',
  activityStartDate: '2026-10-21',
  activityEndDate: '2026-10-23',
  location: 'Malaybalay City',
  picNames: 'Maria Santos',
  updatedAt: '2026-10-20T04:00:00Z',
  submittedAt: null,
  archivedAt: null,
};

const records = (items: ReportListItem[]): ReportListResponse => ({
  items,
  total: items.length,
  page: 1,
  size: 25,
  facets: { campuses: [], terms: [] },
});

const renderPanel = (items: ReportListItem[]) =>
  render(PersonnelRecords, {
    props: {
      records: records(items),
      filters: DEFAULT_PERSONNEL_FILTERS,
      onchange: () => undefined,
      onpage: () => undefined,
      onpagesize: () => undefined,
      onclear: () => undefined,
    },
  }).body;

describe('PersonnelRecords', () => {
  it('holds the register and its filters in one titled panel', () => {
    const html = renderPanel([ITEM]);

    expect(html).toMatch(/class="card records/);
    expect(html).toContain('aria-label="Filter your records"');
    expect(html).toContain('Search AR No., title, or location');
    // The panel draws the border, so the table inside it is flush.
    expect(html).toMatch(/table-scroll[^"]* flush/);
  });

  it('names the record the personnel in charge must open', () => {
    const html = renderPanel([ITEM]);

    expect(html).toContain('AR No. 0001');
    expect(html).toContain('Coastal cleanup');
    expect(html).toContain('Write narrative');
  });

  it('explains an empty register without hiding the filters', () => {
    const html = renderPanel([]);

    expect(html).toContain('No activities are registered yet');
    expect(html).toContain('aria-label="Filter your records"');
  });
});

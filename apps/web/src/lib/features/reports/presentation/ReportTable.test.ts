import type { ReportDraft, ReportListItem } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { pendingRowsFromDrafts, reportRowFromItem } from '../application/report-list';
import ReportTable from './ReportTable.svelte';

const NOW = new Date('2026-03-16T00:00:00.000Z');

const item = (overrides: Partial<ReportListItem> = {}): ReportListItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0001',
  title: 'Marine survey',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  updatedAt: '2026-03-14T01:12:00.000Z',
  ...overrides,
});

const draft = (overrides: Partial<ReportDraft> = {}): ReportDraft => ({
  id: 'd1',
  version: 2,
  updatedAt: '2026-03-15T01:12:00.000Z',
  form: {
    type: 'IN_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'un1',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-12',
    location: 'Gymnasium',
    totalStudents: 10,
    totalPic: 1,
    pics: [{ name: 'A. Cruz', phone: '0917 000 0000' }],
    sdgIds: ['s1'],
    narrative: 'Summary',
  },
  ...overrides,
});

const noop = () => {};

function renderTable(rows: ReturnType<typeof reportRowFromItem>[]) {
  return render(ReportTable, {
    props: {
      rows,
      sort: 'updated',
      dir: 'desc',
      onsort: noop,
      onopen: noop,
      onedit: noop,
      ondelete: noop,
    },
  }).body;
}

describe('ReportTable', () => {
  it('renders the seven columns and marks the active sort', () => {
    const html = renderTable([
      reportRowFromItem(item(), { role: 'SUBMITTER', userId: 'u1', now: NOW }),
    ]);

    for (const label of [
      'Tracking no.',
      'Title',
      'Type',
      'Status',
      'Activity date',
      'Updated',
      'Actions',
    ]) {
      expect(html).toContain(label);
    }

    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('aria-sort="none"');
    expect(html).toContain('caption');
  });

  it('shows the tracking number, badge, range, and exact updated timestamp', () => {
    const html = renderTable([
      reportRowFromItem(item(), { role: 'SUBMITTER', userId: 'u1', now: NOW }),
    ]);

    expect(html).toContain('OFF-2026-0001');
    expect(html).toContain('Submitted');
    expect(html).toContain('12–13 Mar 2026');
    expect(html).toContain('title="14 March 2026, 9:12 AM"');
    expect(html).toContain('yesterday');
    expect(html).toContain('Actions for Marine survey');
    expect(html).toContain('title-text');
    expect(html).toContain('mono');
  });

  it('renders an em dash for a draft with no tracking number', () => {
    const html = renderTable([
      reportRowFromItem(item({ status: 'DRAFT', trackingNumber: null }), {
        role: 'SUBMITTER',
        userId: 'u1',
        now: NOW,
      }),
    ]);

    expect(html).toContain('—');
    expect(html).not.toContain('OFF-2026-0001');
  });

  it('renders a device-only draft as a plain DRAFT row', () => {
    const pending = pendingRowsFromDrafts([draft()], [], NOW);
    const html = renderTable(pending);

    expect(html).toContain('Coastal cleanup');
    expect(html).not.toContain('On this device');
    expect(html).not.toContain('is-pending');
  });

  it('keeps the row menu out of the row navigation target', () => {
    const html = renderTable([
      reportRowFromItem(item(), { role: 'SUBMITTER', userId: 'u1', now: NOW }),
    ]);

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});

import type { ReportListItem } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { registerRow, type RegisterRow } from '../application/report-register';
import ReportTable from './ReportTable.svelte';

const NOW = new Date('2026-10-22T04:00:00Z');

const item = {
  id: 'report-1',
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS' as const,
  status: 'PENDING' as const,
  activityStartDate: '2026-10-21',
  activityEndDate: '2026-10-23',
  location: 'Brgy. Poblacion',
  picNames: 'Maria Santos; Juan Dela Cruz',
  updatedAt: '2026-10-22T02:00:00Z',
  version: 0,
  submittedAt: null,
  approvedAt: null,
};

function renderTable(role: 'ADMIN' | 'PERSONNEL', itemOverrides: Partial<ReportListItem> = {}) {
  const rows: RegisterRow[] = [registerRow({ ...item, ...itemOverrides }, { role })];
  const noop = () => {};

  return render(ReportTable, {
    props: {
      rows,
      sort: 'referenceNo',
      dir: 'desc',
      role,
      now: NOW,
      onsort: noop,
      onedit: noop,
      ondelete: noop,
      onresend: noop,
      onarchive: noop,
      onunarchive: noop,
    },
  }).body;
}

describe('ReportTable', () => {
  it('leads with the AR No. and names the people in charge', () => {
    const html = renderTable('ADMIN');

    expect(html).toContain('AR No.');
    expect(html).toContain('AR No. 0001');
    expect(html).toContain('Coastal cleanup');
    expect(html).toContain('Maria Santos; Juan Dela Cruz');
    expect(html.indexOf('AR No. 0001')).toBeLessThan(html.indexOf('Coastal cleanup'));
  });

  it('offers the office its row actions', () => {
    const html = renderTable('ADMIN');

    expect(html).toContain('aria-label="Edit AR No. 0001"');
    expect(html).toContain('aria-label="Resend invitation for AR No. 0001"');
    expect(html).toContain('aria-label="Delete AR No. 0001"');
    expect(html).not.toContain('Write narrative');
  });

  it('offers archiving only on an approved record', () => {
    const html = renderTable('ADMIN', { status: 'APPROVED', archivedAt: null });
    expect(html).toContain('aria-label="Archive AR No. 0001"');

    const archived = renderTable('ADMIN', {
      status: 'APPROVED',
      archivedAt: '2026-10-22T04:00:00Z',
    });
    expect(archived).toContain('Archived');
    expect(archived).toContain('aria-label="Unarchive AR No. 0001"');
  });

  it('offers a personnel row its one next action', () => {
    expect(renderTable('PERSONNEL')).toContain('Write narrative');
    expect(renderTable('PERSONNEL', { status: 'RETURNED' })).toContain('Revise and resubmit');
    expect(renderTable('PERSONNEL', { status: 'SUBMITTED' })).toContain('View');
  });
});

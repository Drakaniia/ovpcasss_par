import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { PersonnelRow } from '../application/personnel-records';
import PersonnelRecordsTable from './PersonnelRecordsTable.svelte';

const ROW: PersonnelRow = {
  id: 'report-1',
  href: '/reports/report-1',
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  meta: 'Off-campus',
  dates: '21–23 October 2026',
  location: 'Malaybalay City',
  status: 'APPROVED',
  archived: false,
  action: { label: 'View', href: '/reports/report-1' },
};

const RECEIPT = {
  id: 'receipt-1',
  reportId: 'report-1',
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  recipientName: 'Maria Santos',
  generatedAt: '2026-10-25T04:00:00Z',
};

describe('PersonnelRecordsTable', () => {
  it('opens the preview from the row instead of navigating', () => {
    const html = render(PersonnelRecordsTable, {
      props: { rows: [ROW], onopen: () => undefined },
    }).body;

    expect(html).toContain('record-row');
    // The title is the row's preview control, not a link to the record.
    expect(html).toContain('class="title');
    expect(html).not.toMatch(/<a[^>]*class="title/);
    // The explicit row action still navigates.
    expect(html).toContain('href="/reports/report-1"');
    expect(html).toContain('class="row-action');
  });

  it('keeps the AR number out of the navigation', () => {
    const html = render(PersonnelRecordsTable, { props: { rows: [ROW] } }).body;

    expect(html).toContain('<span class="reference');
    expect(html).not.toMatch(/<a[^>]*class="reference/);
  });

  it('offers the receipt action only when the reader holds one', () => {
    const withReceipt = render(PersonnelRecordsTable, {
      props: { rows: [ROW], receipts: new Map([[ROW.id, RECEIPT]]) },
    }).body;
    const withoutReceipt = render(PersonnelRecordsTable, { props: { rows: [ROW] } }).body;

    expect(withReceipt).toContain('receipt-action');
    expect(withoutReceipt).not.toContain('receipt-action');
  });

  it('renders no dialog until a receipt is opened', () => {
    const html = render(PersonnelRecordsTable, {
      props: { rows: [ROW], receipts: new Map([[ROW.id, RECEIPT]]) },
    }).body;

    expect(html).not.toContain('<dialog');
  });
});

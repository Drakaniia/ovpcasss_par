import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ReceiptHistory from './ReceiptHistory.svelte';

const RECEIPTS = [
  {
    id: 'receipt-1',
    reportId: 'report-1',
    referenceNo: 'AR No. 0001',
    title: 'Coastal cleanup and mangrove planting',
    recipientName: 'Maria Santos',
    generatedAt: '2026-10-25T04:00:00Z',
    emailedAt: '2026-10-25T04:00:00Z',
  },
  {
    id: 'receipt-2',
    reportId: 'report-2',
    referenceNo: 'AR No. 0002',
    title: 'Extension lecture',
    recipientName: 'Maria Santos',
    generatedAt: '2026-10-26T04:00:00Z',
  },
];

describe('ReceiptHistory', () => {
  it('lists each receipt with the activity it belongs to', () => {
    const html = render(ReceiptHistory, { props: { receipts: RECEIPTS } }).body;

    expect(html).toContain('Acknowledgment receipts');
    expect(html).toContain('AR No. 0001');
    expect(html).toContain('Coastal cleanup and mangrove planting');
    expect(html).toContain('AR No. 0002');
    expect(html).toContain('Extension lecture');
    expect((html.match(/Download PDF/g) ?? []).length).toBe(2);
    expect((html.match(/Preview/g) ?? []).length).toBe(2);
    expect(html).toContain('mailed');
  });

  it('renders no dialog until a receipt is previewed', () => {
    const html = render(ReceiptHistory, { props: { receipts: RECEIPTS } }).body;

    expect(html).not.toContain('<dialog');
  });

  it('explains an empty history instead of hiding it', () => {
    const html = render(ReceiptHistory, { props: { receipts: [] } }).body;

    expect(html).toContain('Acknowledgment receipts');
    expect(html).toContain('when the office approves');
    expect(html).not.toContain('Download PDF');
  });
});

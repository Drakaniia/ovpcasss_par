import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ReceiptList from './ReceiptList.svelte';

const RECEIPTS = [
  {
    id: 'receipt-1',
    recipientName: 'Maria Santos',
    generatedAt: '2026-10-25T04:00:00Z',
    emailedAt: '2026-10-25T04:00:00Z',
  },
  {
    id: 'receipt-2',
    recipientName: 'Juan Dela Cruz',
    generatedAt: '2026-10-25T04:00:00Z',
  },
];

describe('ReceiptList', () => {
  it('lists one OVPCASSS-F-013 receipt per person in charge', () => {
    const html = render(ReceiptList, {
      props: { reportId: 'report-1', receipts: RECEIPTS },
    }).body;

    expect(html).toContain('Acknowledgment receipts');
    expect(html).toContain('Maria Santos');
    expect(html).toContain('Juan Dela Cruz');
    expect((html.match(/Download PDF/g) ?? []).length).toBe(2);
    expect(html).toContain('Issued');
    expect(html).toContain('mailed');
  });

  it('renders nothing beyond the heading when no receipt exists', () => {
    const html = render(ReceiptList, {
      props: { reportId: 'report-1', receipts: [] },
    }).body;

    expect(html).toContain('Acknowledgment receipts');
    expect(html).not.toContain('Download PDF');
  });
});

import { describe, expect, it } from 'vitest';

import { toMyReceipts } from './my-receipts';

describe('toMyReceipts', () => {
  it('keeps the activity a receipt belongs to', () => {
    const items = toMyReceipts([
      {
        id: 'receipt-1',
        reportId: 'report-1',
        recipientName: 'Maria Santos',
        generatedAt: '2026-10-25T04:00:00.000Z',
        emailedAt: '2026-10-25T04:00:00.000Z',
        referenceNo: 'AR No. 0001',
        title: 'Coastal cleanup',
      },
    ]);

    expect(items).toEqual([
      {
        id: 'receipt-1',
        reportId: 'report-1',
        referenceNo: 'AR No. 0001',
        title: 'Coastal cleanup',
        recipientName: 'Maria Santos',
        generatedAt: '2026-10-25T04:00:00.000Z',
        emailedAt: '2026-10-25T04:00:00.000Z',
      },
    ]);
  });

  it('omits the mail time when the receipt was not mailed', () => {
    const [item] = toMyReceipts([
      {
        id: 'receipt-2',
        reportId: 'report-2',
        recipientName: 'Juan Dela Cruz',
        generatedAt: '2026-10-25T04:00:00.000Z',
        emailedAt: null,
        referenceNo: 'AR No. 0002',
        title: 'Mangrove planting',
      },
    ]);

    expect(item).not.toHaveProperty('emailedAt');
  });
});

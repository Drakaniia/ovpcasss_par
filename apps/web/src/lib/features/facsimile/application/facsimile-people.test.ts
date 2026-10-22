import type { ReportDetail } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { signatureBlock } from './facsimile-people';

const detail = (overrides: Partial<ReportDetail> = {}): ReportDetail =>
  ({
    id: 'r1',
    ownerUserId: 'u1',
    trackingNumber: 'OFF-2026-0014',
    status: 'SUBMITTED',
    version: 2,
    updatedAt: '2026-03-18T10:00:00.000Z',
    submittedAt: '2026-03-18T10:00:00.000Z',
    form: { title: 'Coastal cleanup' },
    attachments: [],
    people: { submitter: { fullName: 'M. Santos', role: 'SUBMITTER' } },
    ...overrides,
  }) as ReportDetail;

describe('signature block', () => {
  it('puts the submitter image beside the submitter name and date', () => {
    const block = signatureBlock(
      detail({
        submitterSignature: {
          signerName: 'M. Santos',
          signedAt: '2026-03-18T09:00:00.000Z',
          signatureUrl: 'https://example.test/signature.png',
        },
      }),
    );

    expect(block.submittedBy).toBe('M. Santos');
    expect(block.submittedAt).toBe('2026-03-18T10:00:00.000Z');
    expect(block.submitterSignatureUrl).toBe('https://example.test/signature.png');
  });

  it('keeps the ruled line for an unsigned report, and never an approval image', () => {
    const block = signatureBlock(detail());

    expect(block.submitterSignatureUrl).toBeUndefined();
    expect(block.signatureUrl).toBeUndefined();
    expect(block.approvedBy).toBeUndefined();
  });

  it('fills the approval slot only once the report is approved', () => {
    const approved = signatureBlock(
      detail({
        status: 'APPROVED',
        completedAt: '2026-03-20T10:00:00.000Z',
        approval: {
          signerName: 'A. Dela Cruz',
          signedAt: '2026-03-20T10:00:00.000Z',
          signatureUrl: 'https://example.test/approver.png',
        },
      }),
    );

    expect(approved).toMatchObject({
      approvedBy: 'A. Dela Cruz',
      approvedAt: '2026-03-20T10:00:00.000Z',
      signatureUrl: 'https://example.test/approver.png',
    });
  });
});

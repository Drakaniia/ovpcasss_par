import type { ReportPicRow, ReportRow } from '@par/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The database and the renderer are replaced; this is about what gets mailed. */
const db = vi.hoisted(() => ({
  receipts: { save: vi.fn(), markEmailed: vi.fn() },
  outbox: { insert: vi.fn() },
}));

const receiptBytes = vi.hoisted(() => new Uint8Array([0x25, 0x50, 0x44, 0x46]));
const renderReceipt = vi.hoisted(() => vi.fn());

vi.mock('@par/db', () => ({
  createDb: () => ({}),
  createReceiptQueries: () => db.receipts,
  createEmailOutboxQueries: () => db.outbox,
}));

vi.mock('@par/export', () => ({ renderReceipt }));

vi.mock('../../settings/application/receipt-signatory', () => ({
  receiptSignatoryFor: async () => ({ name: 'DR. LINCOLN V. TAN', title: 'VPCASSS' }),
}));

import type { Env } from '../../../env';
import { issueReceipts } from './issue-receipts';

const report: ReportRow = {
  id: 'r1',
  referenceNo: 'AR No. 0001',
  sequence: 1,
  type: 'OFF_CAMPUS',
  status: 'APPROVED',
  version: 4,
  createdByUserId: 'admin-1',
  classification: 'CURRICULAR',
  campusId: null,
  unitId: null,
  department: null,
  office: null,
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Barangay Casisang, Malaybalay City',
  activityCount: 1,
  totalStudents: 40,
  totalPic: 2,
  narrative: 'The team collected waste along the breakwater.',
  draftForm: null,
  submittedByUserId: 'person-1',
  narrativeSignatureKey: null,
  narrativeSignedAt: null,
  narrativeSignatureCleared: true,
  approvalSignatureKey: null,
  approvalSignedAt: null,
  submittedAt: '2026-03-14T01:12:00.000Z',
  approvedAt: '2026-03-20T02:00:00.000Z',
  approvedByUserId: 'admin-1',
  completedOn: null,
  archivedAt: null,
  archivedByUserId: null,
  createdAt: '2026-03-10T02:00:00.000Z',
  updatedAt: '2026-03-20T02:00:00.000Z',
};

function pic(overrides: Partial<ReportPicRow>): ReportPicRow {
  return {
    id: 'p1',
    reportId: 'r1',
    userId: 'person-1',
    name: 'M. Santos',
    email: 'santos@buksu.edu.ph',
    phone: null,
    sortOrder: 0,
    invitedAt: '2026-03-10T02:00:00.000Z',
    ...overrides,
  };
}

const queued: { to: string; attachments?: { objectKey: string; filename: string }[] }[] = [];
const stored: { key: string; bytes: Uint8Array }[] = [];

const env = {
  DB: {},
  BUCKET: {
    async put(key: string, bytes: Uint8Array) {
      stored.push({ key, bytes });
    },
  },
  EMAIL_QUEUE: {
    async send(job: { to: string; attachments?: { objectKey: string; filename: string }[] }) {
      queued.push(job);
    },
  },
} as unknown as Env;

beforeEach(() => {
  queued.length = 0;
  stored.length = 0;
  vi.clearAllMocks();
  renderReceipt.mockResolvedValue(receiptBytes);
  db.receipts.save.mockResolvedValue({ id: 'rc1' });
  db.receipts.markEmailed.mockResolvedValue(undefined);
  db.outbox.insert.mockResolvedValue(undefined);
});

describe('issueReceipts', () => {
  it("mails each receipt to the address on that PIC's own row", async () => {
    await issueReceipts(
      env,
      report,
      [
        pic({}),
        // No account was ever opened for this person; the receipt still goes out.
        pic({ id: 'p2', userId: null, name: 'J. Cruz', email: 'cruz@buksu.edu.ph' }),
      ],
      'https://par.example',
    );

    expect(queued.map((job) => job.to)).toEqual(['santos@buksu.edu.ph', 'cruz@buksu.edu.ph']);
    expect(db.outbox.insert).toHaveBeenCalledTimes(2);
    expect(db.outbox.insert.mock.calls[0]?.[0]).toMatchObject({
      kind: 'RECEIPT_ISSUED',
      to: 'santos@buksu.edu.ph',
      status: 'QUEUED',
    });
    expect(db.receipts.markEmailed).toHaveBeenCalledTimes(2);
  });

  it('attaches the rendered OVPCASSS-F-013 to the message', async () => {
    await issueReceipts(env, report, [pic({})], 'https://par.example');

    expect(stored.map((entry) => entry.key)).toContain('receipts/r1/p1.pdf');
    expect(queued[0]?.attachments?.[0]).toMatchObject({
      objectKey: 'receipts/r1/p1.pdf',
      filename: 'OVPCASSS-F-013-AR-No-0001.pdf',
    });
  });

  it('issues nothing for a record that is not approved', async () => {
    await issueReceipts(env, { ...report, status: 'SUBMITTED' }, [pic({})], 'https://par.example');

    expect(queued).toEqual([]);
    expect(db.receipts.save).not.toHaveBeenCalled();
  });

  it('keeps issuing the other receipts when one render fails', async () => {
    renderReceipt.mockRejectedValueOnce(new Error('layout failed'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await issueReceipts(
      env,
      report,
      [pic({}), pic({ id: 'p2', name: 'J. Cruz', email: 'cruz@buksu.edu.ph' })],
      'https://par.example',
    );

    expect(queued.map((job) => job.to)).toEqual(['cruz@buksu.edu.ph']);
    log.mockRestore();
  });
});

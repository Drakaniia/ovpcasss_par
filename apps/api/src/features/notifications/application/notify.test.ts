import type { UserRow } from '@par/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The tables are replaced; this is about which mail a notification writes. */
const db = vi.hoisted(() => ({
  outbox: { insert: vi.fn(), markFailed: vi.fn() },
  notifications: { insert: vi.fn() },
  users: { findById: vi.fn() },
}));

vi.mock('@par/db', () => ({
  createDb: () => ({}),
  createEmailOutboxQueries: () => db.outbox,
  createNotificationQueries: () => db.notifications,
  createUserQueries: () => db.users,
}));

import type { Env } from '../../../env';
import { notify } from './notify';

const user: UserRow = {
  id: 'u1',
  email: 'santos@buksu.edu.ph',
  passwordHash: 'hash',
  hashParams: 'params',
  hasPassword: true,
  fullName: 'M. Santos',
  role: 'PERSONNEL',
  status: 'ACTIVE',
  campusId: null,
  unitId: null,
  campusUnit: null,
  contactNumber: null,
  signatureObjectKey: null,
  emailWorkflow: true,
  emailReminders: true,
  emailVerifiedAt: '2026-10-01T00:00:00.000Z',
  preferences: null,
  lastSignedInAt: null,
  deletedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const queued: { to: string; subject: string }[] = [];

const env = {
  DB: {},
  BUCKET: { async put() {} },
  EMAIL_QUEUE: {
    async send(job: { to: string; subject: string }) {
      queued.push(job);
    },
  },
} as unknown as Env;

/** The approval event as the decision route writes it. */
const approval = {
  userId: 'u1',
  kind: 'APPROVED' as const,
  description: 'AR No. 0014 was approved',
  target: { kind: 'report' as const, reportId: 'r1' },
  email: {
    kind: 'APPROVED' as const,
    to: 'santos@buksu.edu.ph',
    referenceNo: 'AR No. 0014',
    title: 'Coastal cleanup',
    picName: 'M. Santos',
    approvedAt: '2026-10-22T06:05:00.000Z',
    origin: 'https://par.example.edu',
  },
};

beforeEach(() => {
  queued.length = 0;
  vi.clearAllMocks();
  db.users.findById.mockResolvedValue(user);
  db.outbox.insert.mockResolvedValue(undefined);
  db.notifications.insert.mockResolvedValue(undefined);
});

describe('notify', () => {
  it('mails the approval as its own message, without an attachment', async () => {
    await notify(env, approval);

    expect(queued.map((job) => job.to)).toEqual(['santos@buksu.edu.ph']);
    expect(queued[0]?.subject).toBe('[OVPCASSS PAR] AR No. 0014 — narrative report approved');
    expect(db.outbox.insert.mock.calls[0]?.[0]).toMatchObject({
      kind: 'APPROVED',
      to: 'santos@buksu.edu.ph',
      status: 'QUEUED',
    });
  });

  it('keeps the in-app row and suppresses the mail when workflow mail is muted', async () => {
    db.users.findById.mockResolvedValue({ ...user, emailWorkflow: false });

    await notify(env, approval);

    expect(queued).toEqual([]);
    expect(db.notifications.insert).toHaveBeenCalledTimes(1);
    expect(db.outbox.insert.mock.calls[0]?.[0]).toMatchObject({
      kind: 'APPROVED',
      status: 'SUPPRESSED',
    });
  });
});

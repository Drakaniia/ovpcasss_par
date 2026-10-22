import type { InboxEventRow, InboxReportRow, UserRow } from '@par/db';
import type { Role } from '@par/shared';
import { describe, expect, it, vi } from 'vitest';

import { buildInbox, type InboxQueries } from './build-inbox';

const USER: UserRow = {
  id: 'u1',
  email: 'maria@ovpcasss.edu.ph',
  passwordHash: 'hash',
  hashParams: '{}',
  hasPassword: true,
  fullName: 'Maria Santos',
  role: 'SUBMITTER',
  status: 'ACTIVE',
  campusId: null,
  unitId: null,
  campusUnit: 'Main Campus',
  contactNumber: '0917 000 0000',
  signatureObjectKey: null,
  emailWorkflow: true,
  emailReminders: true,
  emailVerifiedAt: null,
  lastSignedInAt: null,
  deletedAt: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

const row = (overrides: Partial<InboxReportRow> = {}): InboxReportRow => ({
  id: 'report-1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  updatedAt: '2026-03-18T10:00:00.000Z',
  submittedAt: '2026-03-18T10:00:00.000Z',
  endorsedAt: null,
  campusId: 'c1',
  unitId: 'un1',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Barangay Poblacion',
  narrative: 'Students walked the shoreline.',
  ...overrides,
});

const event = (overrides: Partial<InboxEventRow> = {}): InboxEventRow => ({
  id: 'event-1',
  reportId: 'report-1',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  action: 'SUBMITTED',
  occurredAt: '2026-03-18T10:00:00.000Z',
  ...overrides,
});

const EMPTY = { total: 0, rows: [] };

function queries(overrides: Partial<InboxQueries['inbox']> = {}): InboxQueries {
  const inbox = {
    returned: vi.fn(async () => EMPTY),
    review: vi.fn(async () => EMPTY),
    approval: vi.fn(async () => EMPTY),
    drafts: vi.fn(async () => EMPTY),
    waiting: vi.fn(async () => EMPTY),
    hasSubmitted: vi.fn(async () => false),
    firstDraftId: vi.fn(async () => null),
    activity: vi.fn(async () => []),
    recentlyDecided: vi.fn(async () => []),
    ...overrides,
  };

  return {
    users: {} as InboxQueries['users'],
    audit: {
      listRecent: vi.fn(async () => []),
    } as unknown as InboxQueries['audit'],
    emailOutbox: {
      countFailed: vi.fn(async () => 0),
    } as unknown as InboxQueries['emailOutbox'],
    notifications: {
      countUnread: vi.fn(async () => 0),
    } as unknown as InboxQueries['notifications'],
    inbox: inbox as unknown as InboxQueries['inbox'],
  };
}

async function inboxFor(role: Role, stubs: Partial<InboxQueries['inbox']> = {}) {
  return buildInbox(queries(stubs), { ...USER, role }, role);
}

describe('buildInbox', () => {
  it('gives a reviewer its queue with a true total and marks an own report', async () => {
    const inbox = await inboxFor('REVIEWER', {
      review: vi.fn(async () => ({
        total: 7,
        rows: [row({ status: 'SUBMITTED' }), row({ id: 'report-2', ownerUserId: 'u2' })],
      })),
    });

    expect(inbox.review.total).toBe(7);
    expect(inbox.review.items).toHaveLength(2);
    expect(inbox.review.items[0]?.isOwn).toBe(true);
    expect(inbox.review.items[1]?.isOwn).toBe(false);
    expect(inbox.returned.total).toBe(0);
    expect(inbox.drafts.total).toBe(0);
  });

  it('keeps the queues off a submitter even when the read would return rows', async () => {
    const inbox = await inboxFor('SUBMITTER', {
      review: vi.fn(async () => ({ total: 4, rows: [row()] })),
    });

    expect(inbox.review).toEqual({ total: 0, items: [] });
  });

  it('assembles returned, drafts, waiting, and real onboarding state', async () => {
    const inbox = await inboxFor('SUBMITTER', {
      returned: vi.fn(async () => ({ total: 1, rows: [row({ status: 'RETURNED_BY_REVIEWER' })] })),
      drafts: vi.fn(async () => ({
        total: 2,
        rows: [row({ id: 'draft-1', status: 'DRAFT', trackingNumber: null })],
      })),
      waiting: vi.fn(async () => ({ total: 3, rows: [row({ status: 'ENDORSED' })] })),
      hasSubmitted: vi.fn(async () => true),
      firstDraftId: vi.fn(async () => 'draft-1'),
    });

    expect(inbox.returned.total).toBe(1);
    expect(inbox.drafts.items[0]?.completeness).toBe(100);
    expect(inbox.waiting.total).toBe(3);
    expect(inbox.onboarding).toEqual({
      profileComplete: true,
      hasSubmitted: true,
      draftId: 'draft-1',
    });
  });

  it('reports activity, recent decisions, and the unread count', async () => {
    // Admin stands in for the submitter side, so its own activity is assembled.
    const inbox = await inboxFor('ADMIN', {
      activity: vi.fn(async () => [event()]),
      recentlyDecided: vi.fn(async () => [event({ id: 'e2', action: 'ENDORSED' })]),
    });
    expect(inbox.activity.map((item) => item.kind)).toEqual(['SUBMITTED']);
    expect(inbox.recentlyDecided?.map((item) => item.kind)).toEqual(['ENDORSED']);
    expect(inbox.notificationsUnread).toBe(0);
  });

  it('gives an admin its own block plus the queues it stands in for', async () => {
    const inbox = await inboxFor('ADMIN', {
      review: vi.fn(async () => ({ total: 2, rows: [row({ ownerUserId: 'u1' })] })),
    });

    expect(inbox.review.total).toBe(2);
    expect(inbox.review.items[0]?.isOwn).toBe(true);
    expect(inbox.admin).not.toBeNull();
  });

  it('leaves the admin block null for every other role', async () => {
    expect((await inboxFor('APPROVER')).admin).toBeNull();
  });
});

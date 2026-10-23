import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_KINDS,
  NOTIFICATION_KIND_LABELS,
  notificationFlagsFor,
  notificationQuerySchema,
  notificationSchema,
  unreadAccessibleLabel,
  unreadBadgeLabel,
} from './notifications';

const row = {
  id: 'n1',
  kind: 'RETURNED',
  description: 'AR No. 0001 was returned by the office',
  comment: 'Add the attendance sheet.',
  target: { kind: 'report', reportId: 'r1' },
  readAt: null,
  createdAt: '2026-03-20T01:12:00.000Z',
};

describe('notification contract', () => {
  it('defaults to the unfiltered first page of 50', () => {
    expect(notificationQuerySchema.parse({})).toEqual({ filter: 'all', page: 1, size: 50 });
  });

  it('coerces paging and rejects an unknown filter', () => {
    expect(notificationQuerySchema.parse({ page: '3' }).page).toBe(3);
    expect(notificationQuerySchema.safeParse({ filter: 'mentions' }).success).toBe(false);
  });

  it('accepts a report row and an account row', () => {
    expect(notificationSchema.parse(row).comment).toContain('attendance');
    const account = notificationSchema.parse({
      id: 'n2',
      kind: 'ACCOUNT',
      description: 'You are now personnel in charge',
      comment: null,
      target: { kind: 'home', reportId: null },
      readAt: null,
      createdAt: '2026-03-19T08:05:00.000Z',
    });
    expect(account.target.reportId).toBeNull();
  });

  it('labels every kind', () => {
    for (const kind of NOTIFICATION_KINDS) expect(NOTIFICATION_KIND_LABELS[kind]).toBeTruthy();
    expect(NOTIFICATION_KIND_LABELS).toMatchObject({
      ASSIGNED: 'Assigned',
      RETURNED: 'Returned',
      APPROVED: 'Approved',
    });
  });

  it('flags work and ownership', () => {
    expect(notificationFlagsFor('ASSIGNED')).toEqual({ needsAction: true, aboutOwnReport: true });
    expect(notificationFlagsFor('SUBMITTED')).toEqual({ needsAction: true, aboutOwnReport: false });
    expect(notificationFlagsFor('APPROVED')).toEqual({ needsAction: false, aboutOwnReport: true });
    expect(notificationFlagsFor('ACCOUNT')).toEqual({ needsAction: false, aboutOwnReport: false });
  });

  it('caps the badge at 9+ but keeps the true count in the label', () => {
    expect(unreadBadgeLabel(10)).toBe('9+');
    expect(unreadAccessibleLabel(0)).toBe('Notifications');
    expect(unreadAccessibleLabel(14)).toBe('Notifications, 14 unread');
  });
});

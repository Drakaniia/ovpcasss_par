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
  description: 'OFF-2026-0014 was returned by M. Santos',
  comment: 'Add the attendance sheet and correct the participant count.',
  target: { kind: 'report', reportId: 'r1' },
  readAt: null,
  createdAt: '2026-03-20T01:12:00.000Z',
};

describe('notification contract', () => {
  it('defaults to the unfiltered first page of 50', () => {
    expect(notificationQuerySchema.parse({})).toEqual({ filter: 'all', page: 1, size: 50 });
  });

  it('coerces the paging query strings the URL carries', () => {
    expect(notificationQuerySchema.parse({ filter: 'action', page: '3' })).toMatchObject({
      filter: 'action',
      page: 3,
    });
  });

  it('rejects an unknown filter instead of guessing one', () => {
    expect(notificationQuerySchema.safeParse({ filter: 'mentions' }).success).toBe(false);
  });

  it('accepts a row with a second-line comment', () => {
    expect(notificationSchema.parse(row).comment).toContain('attendance sheet');
  });

  it('accepts a row with no comment and no target id', () => {
    const parsed = notificationSchema.parse({
      id: 'n2',
      kind: 'ACCOUNT',
      description: 'Your role was assigned: Reviewer',
      comment: null,
      target: { kind: 'home', reportId: null },
      readAt: '2026-03-19T08:05:00.000Z',
      createdAt: '2026-03-19T08:05:00.000Z',
    });

    expect(parsed.target.reportId).toBeNull();
    expect(parsed.readAt).not.toBeNull();
  });

  it('requires a description and the target the row opens', () => {
    expect(notificationSchema.safeParse({ ...row, description: '' }).success).toBe(false);
    expect(notificationSchema.safeParse({ ...row, target: undefined }).success).toBe(false);
  });

  it('labels every kind with the office vocabulary', () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(NOTIFICATION_KIND_LABELS[kind]).toBeTruthy();
    }
    expect(NOTIFICATION_KIND_LABELS).toMatchObject({
      SUBMITTED: 'Submitted',
      RETURNED: 'Returned',
      ENDORSED: 'Endorsed',
      APPROVED: 'Approved',
      ACCOUNT: 'Account',
    });
  });

  it('treats returned work as both action and the reader own report', () => {
    expect(notificationFlagsFor('RETURNED')).toEqual({ needsAction: true, aboutOwnReport: true });
    expect(notificationFlagsFor('APPROVED')).toEqual({ needsAction: false, aboutOwnReport: true });
    expect(notificationFlagsFor('SUBMITTED')).toEqual({ needsAction: true, aboutOwnReport: false });
    expect(notificationFlagsFor('ENDORSED')).toEqual({ needsAction: true, aboutOwnReport: false });
    expect(notificationFlagsFor('ACCOUNT')).toEqual({ needsAction: false, aboutOwnReport: false });
  });

  it('caps the badge at 9+ but keeps the true count in the label', () => {
    expect(unreadBadgeLabel(3)).toBe('3');
    expect(unreadBadgeLabel(9)).toBe('9');
    expect(unreadBadgeLabel(10)).toBe('9+');
    expect(unreadAccessibleLabel(0)).toBe('Notifications');
    expect(unreadAccessibleLabel(1)).toBe('Notifications, 1 unread');
    expect(unreadAccessibleLabel(14)).toBe('Notifications, 14 unread');
  });
});

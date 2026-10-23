import type { Notification } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  emptyStateFor,
  groupNotificationsByDay,
  manilaDayKey,
  notificationHref,
  notificationListUrl,
  notificationQueryFrom,
  notificationTimeLabel,
} from './notification-view';

const NOW = new Date('2026-03-20T02:00:00.000Z'); // 20 Mar, 10:00 in Manila

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    kind: 'RETURNED',
    description: 'AR No. 0014 was returned by the office',
    comment: null,
    target: { kind: 'report', reportId: 'r1' },
    readAt: null,
    createdAt: '2026-03-20T01:12:00.000Z',
    ...overrides,
  };
}

describe('groupNotificationsByDay', () => {
  it('labels today and yesterday, then dates the older group', () => {
    const groups = groupNotificationsByDay(
      [
        notification({ id: 'a', createdAt: '2026-03-20T01:12:00.000Z' }),
        notification({ id: 'b', createdAt: '2026-03-20T00:40:00.000Z' }),
        notification({ id: 'c', createdAt: '2026-03-19T08:05:00.000Z' }),
        notification({ id: 'd', createdAt: '2026-03-14T02:30:00.000Z' }),
      ],
      NOW,
    );

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', '14 Mar 2026']);
    expect(groups.map((group) => group.items.length)).toEqual([2, 1, 1]);
  });

  it('keeps the order the server sent inside a group', () => {
    const groups = groupNotificationsByDay(
      [
        notification({ id: 'newer', createdAt: '2026-03-20T01:12:00.000Z' }),
        notification({ id: 'older', createdAt: '2026-03-20T00:40:00.000Z' }),
      ],
      NOW,
    );

    expect(groups[0].items.map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('groups by the Manila day, not the browser day', () => {
    // 16:30 UTC on 19 March is already 20 March in Manila.
    expect(manilaDayKey('2026-03-19T16:30:00.000Z')).toBe('2026-03-20');
    const groups = groupNotificationsByDay(
      [notification({ createdAt: '2026-03-19T16:30:00.000Z' })],
      NOW,
    );

    expect(groups[0].label).toBe('Today');
  });

  it('returns nothing for an empty inbox', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
  });
});

describe('notificationTimeLabel', () => {
  it('shows a clock time inside today and yesterday', () => {
    expect(notificationTimeLabel('2026-03-20T01:12:00.000Z', NOW)).toBe('09:12');
    expect(notificationTimeLabel('2026-03-19T08:05:00.000Z', NOW)).toBe('16:05');
  });

  it('prefixes the date in an older group', () => {
    expect(notificationTimeLabel('2026-03-14T02:30:00.000Z', NOW)).toBe('14 Mar, 10:30');
  });
});

describe('notificationHref', () => {
  it('opens the report or the account', () => {
    expect(notificationHref({ kind: 'report', reportId: 'r1' })).toBe('/reports/r1');
    expect(notificationHref({ kind: 'profile', reportId: null })).toBe('/profile');
    expect(notificationHref({ kind: 'home', reportId: null })).toBe('/');
  });

  it('falls back to the reports list when the report id is gone', () => {
    expect(notificationHref({ kind: 'report', reportId: null })).toBe('/reports');
  });
});

describe('inbox URL state', () => {
  it('keeps the default URL clean', () => {
    expect(notificationListUrl({ filter: 'all', page: 1 })).toBe('/notifications');
    expect(notificationListUrl({ filter: 'action', page: 1 })).toBe('/notifications?filter=action');
    expect(notificationListUrl({ filter: 'reports', page: 3 })).toBe(
      '/notifications?filter=reports&page=3',
    );
  });

  it('parses the query the URL carries and falls back on nonsense', () => {
    expect(notificationQueryFrom(new URL('https://par.test/notifications'))).toEqual({
      filter: 'all',
      page: 1,
      size: 50,
    });
    expect(
      notificationQueryFrom(new URL('https://par.test/notifications?filter=action&page=2')),
    ).toEqual({ filter: 'action', page: 2, size: 50 });
    expect(notificationQueryFrom(new URL('https://par.test/notifications?filter=mine'))).toEqual({
      filter: 'all',
      page: 1,
      size: 50,
    });
  });
});

describe('emptyStateFor', () => {
  it('distinguishes an empty inbox from an empty filter', () => {
    expect(emptyStateFor('all')).toEqual({
      title: 'No notifications yet.',
      description: 'Activity on your reports appears here.',
    });
    expect(emptyStateFor('action')).toMatchObject({
      title: 'Nothing in this filter.',
      action: { label: 'Show all', href: '/notifications' },
    });
  });
});

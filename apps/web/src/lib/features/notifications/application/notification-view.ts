import {
  NOTIFICATION_FILTER_LABELS,
  NOTIFICATION_FILTERS,
  NOTIFICATION_PAGE_SIZE,
  notificationQuerySchema,
  type Notification,
  type NotificationFilter,
  type NotificationListQuery,
} from '@par/shared';

import { formatDate, formatTime } from '$lib/format/datetime';

const MANILA = 'Asia/Manila';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Day keys are Manila days: the office's day, not the browser's (spec §5). */
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: MANILA,
  day: '2-digit',
  month: 'short',
});

export type NotificationDayGroup = {
  /** Manila calendar day, `2026-03-20`. */
  key: string;
  label: string;
  items: Notification[];
};

export type NotificationEmptyState = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function manilaDayKey(at: string | Date): string {
  const date = typeof at === 'string' ? new Date(at) : at;
  if (Number.isNaN(date.getTime())) return '';

  return dayKeyFormatter.format(date);
}

/**
 * Reverse-chronological day groups (phase 11 §2): Today, Yesterday, then
 * `14 Mar 2026`. The server already ordered the rows, so grouping preserves the
 * order it sent; a day split across two pages repeats its header, which is what
 * page-local grouping means.
 */
export function groupNotificationsByDay(
  items: Notification[],
  now: Date = new Date(),
): NotificationDayGroup[] {
  const today = manilaDayKey(now);
  const yesterday = manilaDayKey(new Date(now.getTime() - DAY_MS));
  const groups: NotificationDayGroup[] = [];

  for (const item of items) {
    const key = manilaDayKey(item.createdAt);
    const current = groups[groups.length - 1];

    if (current && current.key === key) {
      current.items.push(item);
      continue;
    }

    groups.push({ key, label: dayLabel(key, today, yesterday, item.createdAt), items: [item] });
  }

  return groups;
}

function dayLabel(key: string, today: string, yesterday: string, iso: string): string {
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';

  return formatDate(iso);
}

/** `09:12` inside Today and Yesterday; `14 Mar, 09:12` in an older group. */
export function notificationTimeLabel(createdAt: string, now: Date = new Date()): string {
  const key = manilaDayKey(createdAt);
  const today = manilaDayKey(now);
  const yesterday = manilaDayKey(new Date(now.getTime() - DAY_MS));

  if (key === today || key === yesterday) return formatTime(createdAt);

  return `${shortDateFormatter.format(new Date(createdAt))}, ${formatTime(createdAt)}`;
}

/** Where a row opens. A deleted target lands on the shared 404 copy there. */
export function notificationHref(target: Notification['target']): string {
  switch (target.kind) {
    case 'report':
      return target.reportId ? `/reports/${target.reportId}` : '/reports';
    case 'profile':
      return '/profile';
    default:
      return '/';
  }
}

export type NotificationFilterTab = {
  filter: NotificationFilter;
  label: string;
  href: string;
};

/** Filter is URL state, so a filtered inbox can be linked to (phase 11 §2). */
export function notificationFilterTabs(): NotificationFilterTab[] {
  return NOTIFICATION_FILTERS.map((filter) => ({
    filter,
    label: NOTIFICATION_FILTER_LABELS[filter],
    href: notificationListUrl({ filter, page: 1 }),
  }));
}

export function notificationListUrl(query: { filter: NotificationFilter; page: number }): string {
  const params = new URLSearchParams();

  if (query.filter !== 'all') params.set('filter', query.filter);
  if (query.page > 1) params.set('page', String(query.page));

  const search = params.toString();
  return `/notifications${search ? `?${search}` : ''}`;
}

/**
 * Parsed with the shared query schema, so the URL and the API agree on shape.
 * Takes the router's read-only URL as well as a plain one.
 */
export function notificationQueryFrom(url: {
  searchParams: { get(name: string): string | null };
}): NotificationListQuery {
  const parsed = notificationQuerySchema.safeParse({
    filter: url.searchParams.get('filter') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
  });

  if (parsed.success) return parsed.data;

  return { filter: 'all', page: 1, size: NOTIFICATION_PAGE_SIZE };
}

export function emptyStateFor(filter: NotificationFilter): NotificationEmptyState {
  if (filter !== 'all') {
    return {
      title: 'Nothing in this filter.',
      description: 'Show every notification instead.',
      action: { label: 'Show all', href: notificationListUrl({ filter: 'all', page: 1 }) },
    };
  }

  return {
    title: 'No notifications yet.',
    description: 'Activity on your reports appears here.',
  };
}

export const READ_FAILURE_COPY =
  'This notification could not be marked as read. It is still unread.';
export const MARK_ALL_FAILURE_COPY =
  'Your notifications were not marked as read. They are still unread.';

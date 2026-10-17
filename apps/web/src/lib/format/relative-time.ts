import { formatDate } from './datetime';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Tables and inbox rows show relative time with the exact timestamp in a
 * `title` attribute (UI spec §8.3). Older than a week falls back to the table
 * date, which is easier to scan than "58 days ago".
 */
export function formatRelativeTime(isoString: string, now: Date = new Date()): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '—';

  const elapsed = Math.max(0, now.getTime() - then);

  if (elapsed < MINUTE) return 'just now';

  const minutes = Math.floor(elapsed / MINUTE);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;

  const hours = Math.floor(elapsed / HOUR);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(isoString);
}

/** Whole-day age used by the waiting-on-the-office rows: "today", "1 day", "3 days". */
export function formatAge(isoString: string, now: Date = new Date()): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '—';

  const days = Math.floor(Math.max(0, now.getTime() - then) / DAY);
  if (days === 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

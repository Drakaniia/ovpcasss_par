import { TIME_ZONE } from './datetime';

/** Calendar parts use JavaScript's zero-based month. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
}

const manilaDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseIsoDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isoDate(parts: DateParts): string {
  return `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}`;
}

export function todayIso(now: Date = new Date()): string {
  const parts = manilaDateFormatter.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function addDays(iso: string, days: number): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;

  const date = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
  return isoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  });
}

export function addMonths(iso: string, months: number): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;

  const target = new Date(Date.UTC(parts.year, parts.month + months, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return isoDate({ year, month, day: Math.min(parts.day, lastDay) });
}

export function startOfWeekIso(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;

  const weekday = new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
  return addDays(iso, -((weekday + 6) % 7));
}

export function endOfWeekIso(iso: string): string {
  return addDays(startOfWeekIso(iso), 6);
}

/** Six Monday-first weeks, including the adjacent-month days that fill the edges. */
export function monthGrid(year: number, month: number): string[] {
  const start = startOfWeekIso(isoDate({ year, month, day: 1 }));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function monthLabel(year: number, month: number): string {
  return monthFormatter.format(new Date(Date.UTC(year, month, 1)));
}

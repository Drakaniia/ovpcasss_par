/**
 * Working-day age for the review and approval queues (UI spec §7.9). Weekends do
 * not count and the office's clock is Asia/Manila, so the day boundary is
 * Manila's rather than UTC's. One rule, shared: the API computes the header
 * summary and the UI labels each row from the same function.
 */
const MANILA = 'Asia/Manila';
const MS_PER_DAY = 86_400_000;

/** Age in working days at which a queue row turns attention-colored, with text. */
export const QUEUE_AGE_ATTENTION_DAYS = 3;

const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Midnight UTC of the Manila calendar day, so day arithmetic stays exact. */
function dayStart(value: string | Date): number | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // `en-CA` formats as `YYYY-MM-DD`; the defaults only satisfy the unchecked index.
  const [year = 1970, month = 1, day = 1] = manilaDay.format(date).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Weekdays between the two Manila dates, the start day counting as day 0: a
 * report submitted this morning is `today`, one submitted Friday is `1 day` on
 * Monday.
 */
export function workingDaysSince(from: string | Date, now: Date = new Date()): number {
  const start = dayStart(from);
  const end = dayStart(now);
  if (start === null || end === null || end <= start) return 0;

  let days = 0;
  for (let day = start + MS_PER_DAY; day <= end; day += MS_PER_DAY) {
    const weekday = new Date(day).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }

  return days;
}

/** Row and header label: `today`, `1 day`, `4 days`. */
export function queueAgeLabel(days: number): string {
  if (days <= 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Past the threshold the label is shown with a warning color *and* the word. */
export function queueAgeAttention(days: number): boolean {
  return days > QUEUE_AGE_ATTENTION_DAYS;
}

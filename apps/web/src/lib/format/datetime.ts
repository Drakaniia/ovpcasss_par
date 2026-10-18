const TIME_ZONE = 'Asia/Manila';

/** Tables use `20 Mar 2026`; prose uses `20 March 2026, 9:00 AM` (UI spec §11). */
const tableDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const proseDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const proseTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});
/** The wizard's autosave stamp is 24-hour ("Draft saved 09:12"). */
const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
});
const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Stored values are UTC ISO strings; only presentation converts to Asia/Manila (spec §5). */
export function formatDate(isoString: string): string {
  return tableDateFormatter.format(new Date(isoString));
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return `${proseDateFormatter.format(date)}, ${proseTimeFormatter.format(date)}`;
}

/** 24-hour clock in Asia/Manila; used by the wizard's autosave status. */
export function formatTime(isoString: string): string {
  return clockFormatter.format(new Date(isoString));
}

/**
 * Parses the form's typed date (`12 Mar 2026`) into an ISO date. Returns null for
 * anything else, including impossible dates such as 31 Feb, so the field can
 * show its own message instead of silently shifting the day.
 */
export function parseTypedDate(text: string): string | null {
  const match = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTH_NAMES.indexOf(match[2].slice(0, 3).toLowerCase());
  const year = Number(match[3]);
  if (month === -1) return null;

  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function tableDateParts(
  isoString: string,
): { day: string; month: string; year: string } | null {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  const parts = tableDateFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return { day: value('day'), month: value('month'), year: value('year') };
}

/**
 * Activity date column: `12 Mar 2026` for one day, `12–13 Mar 2026` for a range
 * inside one month, `30 Mar – 2 Apr 2026` inside one year (UI spec §7.4).
 */
export function formatDateRange(startIso: string, endIso: string): string {
  if (startIso === endIso) return formatDate(startIso);

  const start = tableDateParts(startIso);
  const end = tableDateParts(endIso);
  if (!start || !end) return '—';

  if (start.year !== end.year) return `${formatDate(startIso)} – ${formatDate(endIso)}`;
  if (start.month !== end.month) {
    return `${start.day} ${start.month} – ${end.day} ${end.month} ${end.year}`;
  }

  return `${start.day}–${end.day} ${end.month} ${end.year}`;
}

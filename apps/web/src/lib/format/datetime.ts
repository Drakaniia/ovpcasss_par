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

/** Stored values are UTC ISO strings; only presentation converts to Asia/Manila (spec §5). */
export function formatDate(isoString: string): string {
  return tableDateFormatter.format(new Date(isoString));
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return `${proseDateFormatter.format(date)}, ${proseTimeFormatter.format(date)}`;
}

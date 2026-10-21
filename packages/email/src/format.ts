/**
 * Date rendering for mail (email spec §6.1). Timestamps are stored in UTC and
 * the office reads them in Asia/Manila, so every helper formats in that zone
 * and never in the server's zone.
 */
const MANILA = 'Asia/Manila';

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function manilaDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function manilaLongDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function manilaDateTime(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** `1 day`, `3 days` — the same wording the queue uses on screen. */
export function pluralDays(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** `1st Semester`, `2nd Semester`; monitoring terms are 1 and 2 only. */
export function semesterLabel(semester: number): string {
  return semester === 1 ? '1st Semester' : '2nd Semester';
}

/** `OFF_CAMPUS` → `Off-campus`, matching the export screen's own labels. */
export function sheetLabel(type: string): string {
  switch (type) {
    case 'OFF_CAMPUS':
      return 'Off-campus';
    case 'EDUCATIONAL_TOUR':
      return 'Educational tour';
    case 'IN_CAMPUS':
      return 'In-campus';
    default:
      return type;
  }
}

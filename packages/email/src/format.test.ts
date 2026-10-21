import { describe, expect, it } from 'vitest';

import { manilaDate, manilaDateTime, manilaLongDate, pluralDays, semesterLabel } from './format';

describe('format', () => {
  it('renders a UTC evening as the next Manila day', () => {
    // 22:30 UTC on 13 October is 06:30 on 14 October in Manila.
    expect(manilaDate('2026-10-13T22:30:00.000Z')).toBe('14 Oct 2026');
    expect(manilaLongDate('2026-10-13T22:30:00.000Z')).toBe('14 October 2026');
    expect(manilaDateTime('2026-10-13T22:30:00.000Z')).toContain('14 Oct 2026');
  });

  it('returns an empty string for a missing or invalid value', () => {
    expect(manilaDate(undefined)).toBe('');
    expect(manilaDateTime('not a date')).toBe('');
  });

  it('labels days and semesters the way the office writes them', () => {
    expect(pluralDays(1)).toBe('1 day');
    expect(pluralDays(4)).toBe('4 days');
    expect(semesterLabel(1)).toBe('1st Semester');
    expect(semesterLabel(2)).toBe('2nd Semester');
  });
});

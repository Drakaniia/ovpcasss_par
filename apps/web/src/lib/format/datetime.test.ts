import { describe, expect, it } from 'vitest';

import { formatDateRange, formatLongDate, parseTypedDate } from './datetime';

describe('formatDateRange', () => {
  it('collapses a single day', () => {
    expect(formatDateRange('2026-03-12', '2026-03-12')).toBe('12 Mar 2026');
  });

  it('joins a range inside one month', () => {
    expect(formatDateRange('2026-03-12', '2026-03-13')).toBe('12–13 Mar 2026');
  });

  it('names both months inside one year', () => {
    expect(formatDateRange('2026-03-30', '2026-04-02')).toBe('30 Mar – 02 Apr 2026');
  });

  it('names both years when the activity crosses one', () => {
    expect(formatDateRange('2026-12-31', '2027-01-02')).toBe('31 Dec 2026 – 02 Jan 2027');
  });

  it('uses an em dash for an unreadable date instead of throwing', () => {
    expect(formatDateRange('not-a-date', '2026-03-13')).toBe('—');
  });
});

describe('formatLongDate', () => {
  it('spells the month for accessible labels', () => {
    expect(formatLongDate('2026-03-15')).toBe('15 March 2026');
  });

  it('returns an empty string for an unreadable date', () => {
    expect(formatLongDate('nope')).toBe('');
  });
});

describe('parseTypedDate', () => {
  it('accepts the display format and returns ISO', () => {
    expect(parseTypedDate('15 Mar 2026')).toBe('2026-03-15');
  });

  it('ignores surrounding whitespace and short month names', () => {
    expect(parseTypedDate('  2 Apr 2026 ')).toBe('2026-04-02');
  });

  it('rejects impossible dates instead of shifting them', () => {
    expect(parseTypedDate('31 Feb 2026')).toBeNull();
  });

  it('rejects anything that is not a date', () => {
    expect(parseTypedDate('2026-03-15')).toBeNull();
  });
});

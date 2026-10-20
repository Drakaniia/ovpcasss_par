import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  endOfWeekIso,
  monthGrid,
  monthLabel,
  parseIsoDate,
  startOfWeekIso,
  todayIso,
} from './calendar';
import { formatLongDate } from './datetime';

describe('parseIsoDate', () => {
  it('accepts a real calendar day, including leap day', () => {
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 1, day: 29 });
  });

  it('rejects impossible or malformed days', () => {
    expect(parseIsoDate('2023-02-29')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-01-32')).toBeNull();
    expect(parseIsoDate('2026-1-01')).toBeNull();
  });
});

describe('todayIso', () => {
  it('uses Asia/Manila rather than the host timezone', () => {
    expect(todayIso(new Date('2026-10-18T15:59:00Z'))).toBe('2026-10-18');
    expect(todayIso(new Date('2026-10-18T16:00:00Z'))).toBe('2026-10-19');
    expect(todayIso(new Date('2025-12-31T16:00:00Z'))).toBe('2026-01-01');
  });
});

describe('date arithmetic', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('clamps to the last day of the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeekIso('2026-03-01')).toBe('2026-02-23');
    expect(endOfWeekIso('2026-03-01')).toBe('2026-03-01');
  });
});

describe('monthGrid', () => {
  it('returns six Monday-first weeks with adjacent-month days', () => {
    const grid = monthGrid(2026, 2);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-02-23');
    expect(grid[6]).toBe('2026-03-01');
    expect(grid[36]).toBe('2026-03-31');
    expect(grid[41]).toBe('2026-04-05');
    expect(monthLabel(2026, 2)).toBe('March 2026');
  });
});

describe('formatLongDate', () => {
  it('names the day for accessible calendar labels', () => {
    expect(formatLongDate('2026-03-01')).toBe('1 March 2026');
    expect(formatLongDate('not-a-date')).toBe('');
  });
});

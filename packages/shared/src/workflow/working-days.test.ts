import { describe, expect, it } from 'vitest';

import {
  QUEUE_AGE_ATTENTION_DAYS,
  queueAgeAttention,
  queueAgeLabel,
  workingDaysSince,
} from './working-days';

/**
 * Manila is UTC+8, so a timestamp late in the UTC day already belongs to the next
 * Manila day. 2026-03-13 is a Friday, 2026-03-16 a Monday.
 */
describe('workingDaysSince', () => {
  it('counts weekdays after the start day, weekends excluded', () => {
    const friday = '2026-03-13T02:00:00.000Z';
    const monday = new Date('2026-03-16T02:00:00.000Z');

    expect(workingDaysSince(friday, monday)).toBe(1);
  });

  it('counts a whole week as five working days', () => {
    expect(workingDaysSince('2026-03-09T02:00:00.000Z', new Date('2026-03-16T02:00:00.000Z'))).toBe(
      5,
    );
  });

  it('is zero on the day it arrived', () => {
    const now = new Date('2026-03-13T06:00:00.000Z');
    expect(workingDaysSince('2026-03-13T02:00:00.000Z', now)).toBe(0);
  });

  it('uses the Manila day boundary, not UTC', () => {
    // 16:00 UTC on Friday is already Saturday in Manila, so Saturday and Sunday
    // are skipped and Monday counts as one working day.
    expect(workingDaysSince('2026-03-13T16:00:00.000Z', new Date('2026-03-16T02:00:00.000Z'))).toBe(
      1,
    );
  });

  it('never returns a negative age for a future date or a bad value', () => {
    expect(workingDaysSince('2026-03-20T02:00:00.000Z', new Date('2026-03-16T02:00:00.000Z'))).toBe(
      0,
    );
    expect(workingDaysSince('not-a-date', new Date('2026-03-16T02:00:00.000Z'))).toBe(0);
  });
});

describe('queue age presentation', () => {
  it('labels a fresh report as today', () => {
    expect(queueAgeLabel(0)).toBe('today');
  });

  it('pluralizes a single day', () => {
    expect(queueAgeLabel(1)).toBe('1 day');
    expect(queueAgeLabel(4)).toBe('4 days');
  });

  it('turns attention past the threshold', () => {
    expect(queueAgeAttention(QUEUE_AGE_ATTENTION_DAYS)).toBe(false);
    expect(queueAgeAttention(QUEUE_AGE_ATTENTION_DAYS + 1)).toBe(true);
  });
});

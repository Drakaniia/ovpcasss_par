import { describe, expect, it } from 'vitest';

import {
  MAX_REMINDERS,
  REMINDER_AFTER_DAYS,
  shouldRemind,
  waitingDays,
} from './reminder-schedule';

const CREATED = '2026-10-01T00:00:00.000Z';

function at(iso: string): Date {
  return new Date(iso);
}

describe('shouldRemind', () => {
  it('waits seven days from creation for the first reminder', () => {
    expect(
      shouldRemind({ createdAt: CREATED, sentCount: 0, lastSentAt: null, now: at('2026-10-07T23:00:00Z') }),
    ).toBe(false);
    expect(
      shouldRemind({ createdAt: CREATED, sentCount: 0, lastSentAt: null, now: at('2026-10-08T00:00:00Z') }),
    ).toBe(true);
    expect(REMINDER_AFTER_DAYS).toBe(7);
  });

  it('waits a week between reminders instead of firing every sweep', () => {
    expect(
      shouldRemind({
        createdAt: CREATED,
        sentCount: 1,
        lastSentAt: '2026-10-08T00:00:00.000Z',
        now: at('2026-10-09T00:00:00Z'),
      }),
    ).toBe(false);
    expect(
      shouldRemind({
        createdAt: CREATED,
        sentCount: 1,
        lastSentAt: '2026-10-08T00:00:00.000Z',
        now: at('2026-10-15T00:00:00Z'),
      }),
    ).toBe(true);
  });

  it('stops after three reminders', () => {
    expect(MAX_REMINDERS).toBe(3);
    expect(
      shouldRemind({
        createdAt: CREATED,
        sentCount: 3,
        lastSentAt: '2026-10-22T00:00:00.000Z',
        now: at('2026-11-30T00:00:00Z'),
      }),
    ).toBe(false);
  });

  it('does not remind when a later reminder has no record of the earlier one', () => {
    expect(
      shouldRemind({ createdAt: CREATED, sentCount: 1, lastSentAt: null, now: at('2026-11-01T00:00:00Z') }),
    ).toBe(false);
  });
});

describe('waitingDays', () => {
  it('counts whole days and never goes negative', () => {
    expect(waitingDays(CREATED, at('2026-10-09T12:00:00Z'))).toBe(8);
    expect(waitingDays(CREATED, at('2026-09-30T12:00:00Z'))).toBe(0);
    expect(waitingDays('not-a-date', at('2026-10-09T12:00:00Z'))).toBe(0);
  });
});

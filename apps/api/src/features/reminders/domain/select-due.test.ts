import { describe, expect, it } from 'vitest';

import { selectDueReminders, type WaitingReport } from './select-due';

/** Monday 21 October 2026, 09:00 Manila. */
const NOW = new Date('2026-10-21T01:00:00.000Z');

function waiting(id: string, since: string): WaitingReport {
  return {
    id,
    trackingNumber: `OFF-2026-${id.padStart(4, '0')}`,
    title: `Report ${id}`,
    ownerUserId: 'owner-1',
    submitterName: 'M. Santos',
    since,
  };
}

describe('selectDueReminders', () => {
  it('ignores a report that has waited two working days', () => {
    // Monday 19 October to Wednesday 21 October is two working days.
    const due = selectDueReminders({
      now: NOW,
      review: [waiting('1', '2026-10-19T02:00:00.000Z')],
      approval: [],
      lastSent: new Map(),
    });

    expect(due).toHaveLength(0);
  });

  it('sends once the report has waited three working days', () => {
    const due = selectDueReminders({
      now: NOW,
      review: [waiting('1', '2026-10-15T02:00:00.000Z')],
      approval: [],
      lastSent: new Map(),
    });

    expect(due).toHaveLength(1);
    expect(due[0]?.workingDays).toBe(4);
    expect(due[0]?.queue).toBe('review');
  });

  it('does not count the weekend', () => {
    // Friday 16 October is one working day before Monday 19 October.
    const due = selectDueReminders({
      now: new Date('2026-10-19T01:00:00.000Z'),
      review: [waiting('1', '2026-10-16T02:00:00.000Z')],
      approval: [],
      lastSent: new Map(),
    });

    expect(due).toHaveLength(0);
  });

  it('does not repeat inside the threshold', () => {
    const due = selectDueReminders({
      now: NOW,
      review: [waiting('1', '2026-10-10T02:00:00.000Z')],
      approval: [],
      lastSent: new Map([['1', '2026-10-19T01:00:00.000Z']]),
    });

    expect(due).toHaveLength(0);
  });

  it('sends again when the threshold has passed since the last reminder', () => {
    const due = selectDueReminders({
      now: NOW,
      review: [waiting('1', '2026-10-01T02:00:00.000Z')],
      approval: [],
      lastSent: new Map([['1', '2026-10-14T01:00:00.000Z']]),
    });

    expect(due).toHaveLength(1);
  });

  it('marks the approval queue separately', () => {
    const due = selectDueReminders({
      now: NOW,
      review: [],
      approval: [waiting('2', '2026-10-13T02:00:00.000Z')],
      lastSent: new Map(),
    });

    expect(due[0]?.queue).toBe('approval');
  });

  it('skips a report with no tracking number', () => {
    const due = selectDueReminders({
      now: NOW,
      review: [{ ...waiting('1', '2026-10-01T02:00:00.000Z'), trackingNumber: null }],
      approval: [],
      lastSent: new Map(),
    });

    expect(due).toHaveLength(0);
  });
});

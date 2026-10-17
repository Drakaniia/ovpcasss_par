import { describe, expect, it } from 'vitest';

import { formatAge, formatRelativeTime } from './relative-time';

const NOW = new Date('2026-03-20T10:00:00Z');

describe('formatRelativeTime', () => {
  it('treats the last minute as just now', () => {
    expect(formatRelativeTime('2026-03-20T09:59:30Z', NOW)).toBe('just now');
  });

  it('counts minutes and hours with singular forms', () => {
    expect(formatRelativeTime('2026-03-20T09:59:00Z', NOW)).toBe('1 minute ago');
    expect(formatRelativeTime('2026-03-20T09:55:00Z', NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime('2026-03-20T09:00:00Z', NOW)).toBe('1 hour ago');
    expect(formatRelativeTime('2026-03-20T07:00:00Z', NOW)).toBe('3 hours ago');
  });

  it('labels the previous day and whole days', () => {
    expect(formatRelativeTime('2026-03-19T04:00:00Z', NOW)).toBe('yesterday');
    expect(formatRelativeTime('2026-03-17T10:00:00Z', NOW)).toBe('3 days ago');
  });

  it('falls back to the table date after a week', () => {
    expect(formatRelativeTime('2026-03-10T10:00:00Z', NOW)).toBe('10 Mar 2026');
  });

  it('never renders a negative age', () => {
    expect(formatRelativeTime('2026-03-20T11:00:00Z', NOW)).toBe('just now');
  });
});

describe('formatAge', () => {
  it('counts whole days for the waiting list', () => {
    expect(formatAge('2026-03-20T01:00:00Z', NOW)).toBe('today');
    expect(formatAge('2026-03-19T09:00:00Z', NOW)).toBe('1 day');
    expect(formatAge('2026-03-17T10:00:00Z', NOW)).toBe('3 days');
  });
});

import type { QueueItem } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  queueEmptyState,
  queueRowFromItem,
  queueSelectionPrompt,
  queueSummary,
  queueTitle,
  queueWaitingHeading,
} from './queue-rows';

/** Friday 13 March 2026; Monday the 16th is two days later in working days. */
const NOW = new Date('2026-03-16T02:00:00.000Z');

const item = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  submitterName: 'M. Santos',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  waitingSince: '2026-03-13T02:00:00.000Z',
  hasPendingAttachments: false,
  ...overrides,
});

describe('queue rows', () => {
  it('names the queue and the waiting date column by role', () => {
    expect(queueTitle('review')).toBe('Review queue');
    expect(queueTitle('approval')).toBe('Approval queue');
    expect(queueWaitingHeading('review')).toBe('Submitted');
    expect(queueWaitingHeading('approval')).toBe('Endorsed');
  });

  it('maps a waiting report to a row with its type label, date, and age', () => {
    const row = queueRowFromItem(item(), { kind: 'review', now: NOW });

    expect(row.typeLabel).toBe('Off-campus');
    expect(row.college).toBe('College of Arts and Sciences');
    expect(row.waitingDate).toBe('13 Mar 2026');
    expect(row.ageDays).toBe(1);
    expect(row.ageLabel).toBe('1 day');
    expect(row.ageAttention).toBe(false);
    expect(row.href).toBe('/review/r1');
  });

  it('turns the age into attention text past three working days', () => {
    const row = queueRowFromItem(item({ waitingSince: '2026-03-09T02:00:00.000Z' }), {
      kind: 'review',
      now: NOW,
    });

    expect(row.ageLabel).toBe('5 days');
    expect(row.ageAttention).toBe(true);
  });

  it('carries the queue filters into the row link', () => {
    const row = queueRowFromItem(item(), { kind: 'approval', now: NOW, search: 'sort=age&page=2' });

    expect(row.href).toBe('/approval/r1?sort=age&page=2');
  });

  it('summarizes the backlog and stays silent on an empty queue', () => {
    expect(queueSummary(4, 3)).toEqual({
      count: '4 reports',
      age: 'oldest 3 days',
      attention: false,
    });
    expect(queueSummary(1, 0)).toEqual({
      count: '1 report',
      age: 'oldest today',
      attention: false,
    });
    expect(queueSummary(2, 6)?.attention).toBe(true);
    expect(queueSummary(0, 0)).toBeNull();
  });

  it('offers clear filters when the queue is filtered empty', () => {
    const empty = queueEmptyState('review', {
      hasFilters: true,
      filteredHref: '/review',
      repositoryHref: '/search',
    });

    expect(empty.title).toBe('No reports match these filters.');
    expect(empty.action).toEqual({ label: 'Clear filters', href: '/review' });
  });

  it('names the repository for a genuinely empty queue', () => {
    const review = queueEmptyState('review', {
      hasFilters: false,
      filteredHref: '/review',
      repositoryHref: '/search',
    });
    const approval = queueEmptyState('approval', {
      hasFilters: false,
      filteredHref: '/approval',
      repositoryHref: '/search',
    });

    expect(review.title).toBe('Nothing waiting for review.');
    expect(review.description).toBe('New submissions appear here and are emailed to you.');
    expect(review.action).toEqual({ label: 'Open repository', href: '/search' });
    expect(approval.title).toBe('Nothing waiting for approval.');
  });

  it('prompts for a selection per role', () => {
    expect(queueSelectionPrompt('review')).toBe('Select a report to review');
    expect(queueSelectionPrompt('approval')).toBe('Select a report to approve');
  });
});

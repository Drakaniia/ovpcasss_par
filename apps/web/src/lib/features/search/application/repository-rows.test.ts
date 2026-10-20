import type { RepositoryItem } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  countLine,
  highlightSegments,
  repositoryEmptyState,
  repositoryRowFromItem,
} from './repository-rows';

const item = (overrides: Partial<RepositoryItem> = {}): RepositoryItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  level: 'UNDERGRADUATE',
  status: 'APPROVED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  receivedAt: '2026-03-14T01:12:00.000Z',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  ...overrides,
});

describe('highlighting', () => {
  it('marks the matched term and keeps the rest of the text', () => {
    expect(highlightSegments('Coastal cleanup', 'clean')).toEqual([
      { text: 'Coastal ', match: false },
      { text: 'clean', match: true },
      { text: 'up', match: false },
    ]);
  });

  it('matches case-insensitively and highlights every term', () => {
    const segments = highlightSegments('Coastal cleanup in Bauan', 'cleanup bauan');

    expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual([
      'cleanup',
      'Bauan',
    ]);
    expect(segments.map((segment) => segment.text).join('')).toBe('Coastal cleanup in Bauan');
  });

  it('treats typed punctuation literally', () => {
    expect(highlightSegments('a+b report', 'a+b')).toEqual([
      { text: 'a+b', match: true },
      { text: ' report', match: false },
    ]);
  });

  it('returns the whole text as one segment when there is nothing to match', () => {
    expect(highlightSegments('Coastal cleanup', '')).toEqual([
      { text: 'Coastal cleanup', match: false },
    ]);
    expect(highlightSegments('Coastal cleanup', 'museum')).toEqual([
      { text: 'Coastal cleanup', match: false },
    ]);
  });
});

describe('counts', () => {
  it('names the result count, always with the noun', () => {
    expect(countLine(212)).toBe('212 reports match');
    expect(countLine(1)).toBe('1 report matches');
    expect(countLine(0)).toBe('0 reports match');
  });
});

describe('rows', () => {
  it('builds the register row with the official labels and dates', () => {
    const row = repositoryRowFromItem(item());

    expect(row).toMatchObject({
      href: '/reports/r1',
      trackingNumber: 'OFF-2026-0014',
      typeLabel: 'Off-campus',
      classificationLabel: 'Curricular',
      levelLabel: 'Undergraduate',
      status: 'APPROVED',
      received: '14 Mar 2026',
      activity: '12–13 Mar 2026',
      snippet: null,
    });
  });

  it('highlights the query in the title and in the narrative snippet', () => {
    const row = repositoryRowFromItem(item({ snippet: 'Pupils collected 40 sacks of debris.' }), {
      query: 'sacks',
    });

    expect(row.titleSegments).toEqual([{ text: 'Coastal cleanup', match: false }]);
    expect(row.snippetSegments.filter((segment) => segment.match).map((s) => s.text)).toEqual([
      'sacks',
    ]);
  });
});

describe('empty states', () => {
  it('offers Clear filters when a search returned nothing', () => {
    expect(
      repositoryEmptyState({ hasFilters: true, hasQuery: false, clearHref: '/search' }),
    ).toEqual({
      title: 'No reports matched.',
      description: 'Adjust the search term or the filters, then try again.',
      action: { label: 'Clear filters', href: '/search' },
    });
  });

  it('explains an empty register when nothing was searched for', () => {
    const empty = repositoryEmptyState({
      hasFilters: false,
      hasQuery: false,
      clearHref: '/search',
    });

    expect(empty.title).toBe('No approved reports yet.');
    expect(empty.action).toBeUndefined();
  });
});

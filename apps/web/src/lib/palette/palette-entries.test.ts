import type { ReportListItem } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  filterPages,
  matchSegments,
  palettePages,
  paletteReports,
  PALETTE_MIN_REPORT_QUERY,
} from './palette-entries';

const item = (overrides: Partial<ReportListItem> = {}): ReportListItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0001',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  updatedAt: '2026-03-14T01:12:00.000Z',
  ...overrides,
});

describe('palettePages', () => {
  it('lists the role destinations in nav order, then Profile and Notifications', () => {
    expect(palettePages('SUBMITTER').map((page) => page.label)).toEqual([
      'Home',
      'Reports',
      'Profile',
      'Notifications',
    ]);
  });

  it('hides Queues, Repository, and Admin from a Submitter', () => {
    const labels = palettePages('SUBMITTER').map((page) => page.label);

    expect(labels).not.toContain('Queues');
    expect(labels).not.toContain('Repository');
    expect(labels).not.toContain('Admin');
  });

  it('adds the reviewer and admin destinations for the roles that have them', () => {
    expect(palettePages('REVIEWER').map((page) => page.label)).toEqual([
      'Home',
      'Reports',
      'Queues',
      'Repository',
      'Profile',
      'Notifications',
    ]);

    expect(palettePages('ADMIN').map((page) => page.label)).toEqual([
      'Home',
      'Reports',
      'Queues',
      'Repository',
      'Admin',
      'Profile',
      'Notifications',
    ]);
  });

  it('gives every page a description', () => {
    for (const page of palettePages('ADMIN')) expect(page.description.length).toBeGreaterThan(0);
  });
});

describe('filterPages', () => {
  const pages = palettePages('APPROVER');

  it('returns every page for an empty query', () => {
    expect(filterPages(pages, '')).toHaveLength(pages.length);
  });

  it('matches page labels case-insensitively', () => {
    expect(filterPages(pages, 'rep').map((page) => page.label)).toEqual(['Reports', 'Repository']);
    expect(filterPages(pages, 'QUEUE').map((page) => page.label)).toEqual(['Queues']);
  });

  it('returns nothing for a label that does not exist', () => {
    expect(filterPages(pages, 'exports')).toEqual([]);
  });
});

describe('matchSegments', () => {
  it('marks the matched substring once', () => {
    expect(matchSegments('Coastal cleanup', 'clean')).toEqual([
      { text: 'Coastal ', match: false },
      { text: 'clean', match: true },
      { text: 'up', match: false },
    ]);
  });

  it('returns the whole text unmatched when the query is empty or absent', () => {
    expect(matchSegments('Home', '')).toEqual([{ text: 'Home', match: false }]);
    expect(matchSegments('Home', 'zzz')).toEqual([{ text: 'Home', match: false }]);
  });

  it('handles a match at either end', () => {
    expect(matchSegments('OFF-2026-0014', 'OFF')).toEqual([
      { text: 'OFF', match: true },
      { text: '-2026-0014', match: false },
    ]);
    expect(matchSegments('OFF-2026-0014', '0014')).toEqual([
      { text: 'OFF-2026-', match: false },
      { text: '0014', match: true },
    ]);
  });
});

describe('paletteReports', () => {
  it('opens a submitted report on its facsimile', () => {
    expect(paletteReports([item()])).toEqual([
      {
        id: 'r1',
        href: '/reports/r1',
        trackingNumber: 'OFF-2026-0001',
        title: 'Coastal cleanup',
        status: 'SUBMITTED',
      },
    ]);
  });

  it('opens a draft on the edit page and keeps its missing tracking number', () => {
    const [draft] = paletteReports([item({ status: 'DRAFT', trackingNumber: null })]);

    expect(draft.href).toBe('/reports/r1/edit');
    expect(draft.trackingNumber).toBeNull();
  });

  it('searches reports only from two characters', () => {
    expect(PALETTE_MIN_REPORT_QUERY).toBe(2);
  });
});

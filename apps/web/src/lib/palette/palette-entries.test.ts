import type { ReportSearchItem } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  filterPages,
  matchSegments,
  palettePages,
  paletteReports,
  PALETTE_MIN_REPORT_QUERY,
} from './palette-entries';

const item = (overrides: Partial<ReportSearchItem> = {}): ReportSearchItem => ({
  id: 'r1',
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  status: 'SUBMITTED',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Batangas City',
  picNames: 'M. Santos',
  updatedAt: '2026-03-14T01:12:00.000Z',
  unitName: 'College of Arts and Sciences',
  ...overrides,
});

describe('palettePages', () => {
  it('lists the role destinations in nav order, then Profile and Notifications', () => {
    expect(palettePages('PERSONNEL').map((page) => page.label)).toEqual([
      'Home',
      'Profile',
      'Notifications',
    ]);
  });

  it('adds Admin for the office account', () => {
    expect(palettePages('ADMIN').map((page) => page.label)).toEqual([
      'Home',
      'Reports',
      'Repository',
      'Admin',
      'Profile',
      'Notifications',
    ]);
  });

  it('offers no destinations when signed out', () => {
    expect(palettePages(null).map((page) => page.label)).toEqual(['Profile', 'Notifications']);
  });

  it('gives every page a description', () => {
    for (const page of palettePages('ADMIN')) expect(page.description.length).toBeGreaterThan(0);
  });
});

describe('filterPages', () => {
  const pages = palettePages('ADMIN');

  it('returns every page for an empty query', () => {
    expect(filterPages(pages, '')).toHaveLength(pages.length);
  });

  it('matches page labels case-insensitively', () => {
    expect(filterPages(pages, 'rep').map((page) => page.label)).toEqual(['Reports', 'Repository']);
    expect(filterPages(pages, 'ADM').map((page) => page.label)).toEqual(['Admin']);
  });

  it('returns nothing for a label that does not exist', () => {
    expect(filterPages(pages, 'queues')).toEqual([]);
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
    expect(matchSegments('AR No. 0014', 'AR')).toEqual([
      { text: 'AR', match: true },
      { text: ' No. 0014', match: false },
    ]);
    expect(matchSegments('AR No. 0014', '0014')).toEqual([
      { text: 'AR No. ', match: false },
      { text: '0014', match: true },
    ]);
  });
});

describe('paletteReports', () => {
  it('opens a submitted report on its record page and carries the preview context', () => {
    expect(paletteReports([item({ matched: 'narrative', snippet: '…the cleanup…' })])).toEqual([
      {
        id: 'r1',
        href: '/reports/r1',
        referenceNo: 'AR No. 0001',
        title: 'Coastal cleanup',
        status: 'SUBMITTED',
        type: 'OFF_CAMPUS',
        picNames: 'M. Santos',
        unitName: 'College of Arts and Sciences',
        activityStartDate: '2026-03-12',
        activityEndDate: '2026-03-13',
        matched: 'narrative',
        snippet: '…the cleanup…',
      },
    ]);
  });

  it('keeps a recent row free of a match reason', () => {
    expect(paletteReports([item()])[0]).not.toHaveProperty('matched');
    expect(paletteReports([item()])[0]).not.toHaveProperty('snippet');
  });

  it('opens a pending record on the edit page and keeps its AR No.', () => {
    const [pending] = paletteReports([item({ status: 'PENDING' })]);

    expect(pending.href).toBe('/reports/r1/edit');
    expect(pending.referenceNo).toBe('AR No. 0001');
  });

  it('searches reports only from two characters', () => {
    expect(PALETTE_MIN_REPORT_QUERY).toBe(2);
  });
});

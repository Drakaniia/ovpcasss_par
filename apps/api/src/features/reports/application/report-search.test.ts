import type { ReportSearchRow } from '@par/db';
import { describe, expect, it } from 'vitest';

import { matchOf, snippetAround, toReportSearchItem } from './report-search';

/** A stored row with the columns the palette reads; the rest are inert. */
function row(overrides: Partial<ReportSearchRow> = {}): ReportSearchRow {
  return {
    id: 'r1',
    referenceNo: 'AR No. 0001',
    sequence: 1,
    type: 'OFF_CAMPUS',
    status: 'SUBMITTED',
    version: 1,
    createdByUserId: 'u0',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'u1',
    department: null,
    office: null,
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-13',
    location: 'Barangay Casisang, Malaybalay City',
    activityCount: 1,
    totalStudents: 40,
    totalPic: 2,
    narrative: 'The team collected waste along the breakwater before the briefing.',
    draftForm: null,
    submittedByUserId: 'u2',
    narrativeSignatureKey: null,
    narrativeSignedAt: null,
    narrativeSignatureCleared: false,
    approvalSignatureKey: null,
    approvalSignedAt: null,
    submittedAt: '2026-03-14T01:12:00.000Z',
    approvedAt: null,
    approvedByUserId: null,
    completedOn: null,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: '2026-03-10T02:00:00.000Z',
    updatedAt: '2026-03-14T01:12:00.000Z',
    unitName: 'College of Arts and Sciences',
    picNames: 'M. Santos, J. Dela Cruz',
    ...overrides,
  };
}

describe('matchOf', () => {
  it('names the field a hit came from', () => {
    expect(matchOf(row(), 'cleanup')).toBe('title');
    expect(matchOf(row(), 'breakwater')).toBe('narrative');
    expect(matchOf(row(), 'casisang')).toBe('location');
    expect(matchOf(row(), 'dela cruz')).toBe('pic');
  });

  it('reads any spelling of the AR No. as the reference', () => {
    expect(matchOf(row(), 'AR No. 0001')).toBe('reference');
    expect(matchOf(row(), '0001')).toBe('reference');
    expect(matchOf(row(), 'ar no 1')).toBe('reference');
  });

  it('reports nothing for the recent group and for a miss', () => {
    expect(matchOf(row(), '')).toBeUndefined();
    expect(matchOf(row(), '   ')).toBeUndefined();
    expect(matchOf(row(), 'volleyball')).toBeUndefined();
  });

  it('never names or quotes a narrative private to another PIC', () => {
    expect(matchOf(row(), 'breakwater', false)).toBeUndefined();
    // Another field still explains the row; the prose stays hidden.
    expect(matchOf(row(), 'cleanup', false)).toBe('title');
  });
});

describe('snippetAround', () => {
  it('quotes one line around the hit', () => {
    const text = 'First line.\n\nSecond line mentions the breakwater survey, then more text.';
    const snippet = snippetAround(text, 'breakwater', 10);

    expect(snippet).not.toContain('\n');
    expect(snippet).toContain('breakwater');
    expect(snippet?.startsWith('\u2026')).toBe(true);
    expect(snippet?.endsWith('\u2026')).toBe(true);
  });

  it('keeps the opening of the narrative without a leading ellipsis', () => {
    expect(snippetAround('Coastal cleanup at dawn.', 'cleanup', 20)).toBe(
      'Coastal cleanup at dawn.',
    );
  });

  it('returns nothing when the term is absent', () => {
    expect(snippetAround('Coastal cleanup at dawn.', 'volleyball')).toBeUndefined();
  });
});

describe('toReportSearchItem', () => {
  it('carries the preview context and no match reason for the recent group', () => {
    const item = toReportSearchItem(row(), '');

    expect(item.referenceNo).toBe('AR No. 0001');
    expect(item.unitName).toBe('College of Arts and Sciences');
    expect(item.classification).toBe('CURRICULAR');
    expect(item.matched).toBeUndefined();
    expect(item.snippet).toBeUndefined();
  });

  it('adds the match reason, and a snippet only for a narrative hit', () => {
    const narrative = toReportSearchItem(row(), 'breakwater');
    expect(narrative.matched).toBe('narrative');
    expect(narrative.snippet).toContain('breakwater');

    const title = toReportSearchItem(row(), 'cleanup');
    expect(title.matched).toBe('title');
    expect(title.snippet).toBeUndefined();
  });

  it('withholds the snippet when the narrative is private', () => {
    const item = toReportSearchItem(row(), 'breakwater', false);

    expect(item.matched).toBeUndefined();
    expect(item.snippet).toBeUndefined();
  });
});

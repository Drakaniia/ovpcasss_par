import type { ReportSearchRow } from '@par/db';
import { describe, expect, it } from 'vitest';

import { matchOf, snippetAround, toReportSearchItem } from './report-search';

function row(overrides: Partial<ReportSearchRow['report']> = {}): ReportSearchRow {
  return {
    report: {
      id: 'r1',
      type: 'OFF_CAMPUS',
      trackingNumber: 'OFF-2026-0014',
      status: 'SUBMITTED',
      version: 1,
      ownerUserId: 'u1',
      classification: 'CURRICULAR',
      campusId: 'c1',
      unitId: 'col1',
      department: null,
      office: null,
      level: 'UNDERGRADUATE',
      title: 'Coastal cleanup',
      activityStartDate: '2026-03-12',
      activityEndDate: '2026-03-13',
      location: 'Barangay Poblacion',
      totalStudents: 40,
      totalPic: 2,
      narrative: 'Students walked the shoreline and collected waste along the breakwater.',
      draftForm: null,
      submittedAt: '2026-03-14T01:12:00.000Z',
      endorsedAt: null,
      approvedAt: null,
      approvedByUserId: null,
      createdAt: '2026-03-10T02:00:00.000Z',
      updatedAt: '2026-03-14T01:12:00.000Z',
      ...overrides,
    },
    ownerName: 'M. Santos',
    unitName: 'College of Arts and Sciences',
    picName: null,
  };
}

describe('snippetAround', () => {
  it('keeps a window of narrative on each side of the hit', () => {
    const text = `${'a'.repeat(200)} breakwater ${'b'.repeat(200)}`;
    const snippet = snippetAround(text, 'breakwater');

    expect(snippet?.startsWith('…')).toBe(true);
    expect(snippet?.endsWith('…')).toBe(true);
    expect(snippet).toContain('breakwater');
    expect(snippet?.length).toBeLessThan(400);
  });

  it('collapses the whitespace a stored narrative may carry', () => {
    expect(snippetAround('walked\n\nthe   shoreline', 'shoreline')).toBe('walked the shoreline');
  });

  it('has nothing to show when the text does not contain the term', () => {
    expect(snippetAround('walked the shoreline', 'riverbank')).toBeUndefined();
    expect(snippetAround('walked the shoreline', '')).toBeUndefined();
  });
});

describe('matchOf', () => {
  it('names the field the term was found in', () => {
    expect(matchOf(row(), 'OFF-2026')).toBe('tracking');
    expect(matchOf(row(), 'coastal')).toBe('title');
    expect(matchOf(row(), 'breakwater')).toBe('narrative');
    expect(matchOf(row(), 'poblacion')).toBe('location');
    expect(matchOf(row(), 'santos')).toBe('submitter');
    expect(matchOf({ ...row(), picName: 'J. Cruz' }, 'cruz')).toBe('pic');
  });

  it('is undefined for the recent group, which matched nothing', () => {
    expect(matchOf(row(), '')).toBeUndefined();
  });
});

describe('toReportSearchItem', () => {
  it('carries the preview context the palette shows', () => {
    const item = toReportSearchItem(row(), 'breakwater');

    expect(item).toMatchObject({
      id: 'r1',
      trackingNumber: 'OFF-2026-0014',
      title: 'Coastal cleanup',
      ownerName: 'M. Santos',
      unitName: 'College of Arts and Sciences',
      classification: 'CURRICULAR',
      matched: 'narrative',
    });
    expect(item.snippet).toContain('breakwater');
  });

  it('adds no snippet when the hit was not in the narrative', () => {
    expect(toReportSearchItem(row(), 'coastal').snippet).toBeUndefined();
  });

  it('leaves the match reason out of the recent group', () => {
    expect(toReportSearchItem(row(), '').matched).toBeUndefined();
  });
});

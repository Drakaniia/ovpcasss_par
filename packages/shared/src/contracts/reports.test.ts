import { describe, expect, it } from 'vitest';

import {
  acknowledgementResponseSchema,
  reportDetailSchema,
  reportListQuerySchema,
  reportPdfResponseSchema,
  reportSearchQuerySchema,
  reportSearchResponseSchema,
} from './reports';

const detail = {
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  status: 'RETURNED_BY_APPROVER',
  version: 4,
  updatedAt: '2026-03-18T03:20:00.000Z',
  submittedAt: '2026-03-14T01:12:00.000Z',
  returnedAt: '2026-03-18T03:20:00.000Z',
  form: {
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'un1',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-13',
    location: 'Brgy. Poblacion',
    totalStudents: 42,
    totalPic: 3,
    pics: [{ name: 'M. Santos' }],
    sdgIds: ['s14'],
    narrative: 'Summary.',
  },
  attachments: [],
  people: {
    submitter: { fullName: 'J. Dela Cruz', role: 'SUBMITTER' },
    approver: { fullName: 'A. Reyes', role: 'APPROVER', actedAt: '2026-03-18T03:20:00.000Z' },
  },
  history: [
    {
      at: '2026-03-14T01:12:00.000Z',
      actorName: 'J. Dela Cruz',
      actorRole: 'SUBMITTER',
      action: 'Submitted',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
    },
  ],
  commentRounds: [
    {
      round: 1,
      authorName: 'A. Reyes',
      authorRole: 'APPROVER',
      createdAt: '2026-03-18T03:20:00.000Z',
      comments: 'Add the partner office.',
    },
  ],
} as const;

describe('reportDetailSchema', () => {
  it('accepts the facsimile detail with people, history, rounds, and approval', () => {
    const parsed = reportDetailSchema.parse({
      ...detail,
      approval: { signerName: 'A. Reyes', signedAt: '2026-03-20T01:00:00.000Z' },
      completedAt: '2026-03-20T01:00:00.000Z',
    });

    expect(parsed.people?.submitter.fullName).toBe('J. Dela Cruz');
    expect(parsed.history?.[0]?.toStatus).toBe('SUBMITTED');
    expect(parsed.commentRounds?.[0]?.round).toBe(1);
  });

  it('accepts a report that carries none of the facsimile extras', () => {
    const parsed = reportDetailSchema.parse({
      ...detail,
      status: 'SUBMITTED',
      people: undefined,
      history: undefined,
      commentRounds: undefined,
    });

    expect(parsed.people).toBeUndefined();
    expect(parsed.history).toBeUndefined();
  });

  it('rejects a status the workflow does not have', () => {
    expect(reportDetailSchema.safeParse({ ...detail, status: 'IN_PROGRESS' }).success).toBe(false);
  });
});

describe('reportListQuerySchema', () => {
  it('reads the page size from the query string the page sends', () => {
    const parsed = reportListQuerySchema.parse({ size: '50', page: '2' });

    expect(parsed.size).toBe(50);
    expect(parsed.page).toBe(2);
  });

  it('defaults the page size when the query omits it', () => {
    expect(reportListQuerySchema.parse({}).size).toBe(25);
  });

  it('rejects a page size the table cannot show', () => {
    expect(reportListQuerySchema.safeParse({ size: '30' }).success).toBe(false);
  });
});

describe('reportSearchQuerySchema', () => {
  it('accepts the empty query that asks for the recent group', () => {
    expect(reportSearchQuerySchema.parse({})).toEqual({ limit: 8 });
  });

  it('rejects a one-character query rather than searching the world', () => {
    expect(reportSearchQuerySchema.safeParse({ q: 'c' }).success).toBe(false);
    expect(reportSearchQuerySchema.parse({ q: 'co' }).q).toBe('co');
  });

  it('caps the number of rows the palette can ask for', () => {
    expect(reportSearchQuerySchema.safeParse({ limit: '21' }).success).toBe(false);
    expect(reportSearchQuerySchema.parse({ limit: '5' }).limit).toBe(5);
  });
});

describe('reportSearchResponseSchema', () => {
  const item = {
    id: 'r1',
    ownerUserId: 'u1',
    trackingNumber: 'OFF-2026-0014',
    title: 'Coastal cleanup',
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    status: 'SUBMITTED',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-13',
    updatedAt: '2026-03-14T01:12:00.000Z',
    ownerName: 'M. Santos',
    unitName: 'College of Arts and Sciences',
  };

  it('accepts a recent row with no match reason', () => {
    const parsed = reportSearchResponseSchema.parse({ items: [item] });

    expect(parsed.items[0]?.matched).toBeUndefined();
    expect(parsed.items[0]?.trackingNumber).toBe('OFF-2026-0014');
  });

  it('names the field a hit came from', () => {
    const parsed = reportSearchResponseSchema.parse({
      items: [{ ...item, matched: 'narrative', snippet: '…the cleanup…' }],
    });

    expect(parsed.items[0]?.matched).toBe('narrative');
  });

  it('rejects an unknown match reason', () => {
    expect(
      reportSearchResponseSchema.safeParse({ items: [{ ...item, matched: 'vibes' }] }).success,
    ).toBe(false);
  });
});

describe('reportPdfResponseSchema', () => {
  it('carries one of the three watermark values', () => {
    expect(
      reportPdfResponseSchema.parse({ url: 'https://signed', watermark: 'NOT_APPROVED' }),
    ).toMatchObject({ watermark: 'NOT_APPROVED' });
    expect(
      reportPdfResponseSchema.safeParse({ url: 'https://signed', watermark: 'DRAFTED' }).success,
    ).toBe(false);
  });
});

describe('acknowledgementResponseSchema', () => {
  it('requires a signed URL', () => {
    expect(acknowledgementResponseSchema.safeParse({}).success).toBe(false);
    expect(acknowledgementResponseSchema.parse({ url: 'https://signed' }).url).toBe(
      'https://signed',
    );
  });
});

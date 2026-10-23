import { describe, expect, it } from 'vitest';

import {
  reportActivitySchema,
  reportDetailSchema,
  reportListQuerySchema,
  reportPdfResponseSchema,
  reportSearchQuerySchema,
  reportSearchResponseSchema,
  reportSignatureSchema,
} from './reports';

const detail = {
  id: 'r1',
  referenceNo: 'AR No. 0001',
  createdByUserId: 'a1',
  status: 'RETURNED',
  version: 3,
  createdAt: '2026-03-10T03:20:00.000Z',
  updatedAt: '2026-03-18T03:20:00.000Z',
  submittedAt: '2026-03-14T01:12:00.000Z',
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
    activityCount: 2,
    totalStudents: 42,
    totalPic: 1,
    pics: [{ name: 'M. Santos', email: 'santos@buksu.edu.ph' }],
    sdgIds: ['s14'],
    narrative: 'Summary.',
  },
  pics: [{ id: 'p1', name: 'M. Santos', email: 'santos@buksu.edu.ph', userId: 'u1' }],
  attachments: [],
  receipts: [],
  returnEvent: {
    comments: 'Add the partner office.',
    authorName: 'A. Reyes',
    createdAt: '2026-03-18T03:20:00.000Z',
  },
  people: {
    createdBy: { fullName: 'A. Reyes', role: 'ADMIN' },
    personnel: [{ fullName: 'M. Santos', role: 'PERSONNEL' }],
  },
  history: [
    {
      at: '2026-03-14T01:12:00.000Z',
      actorName: 'M. Santos',
      actorRole: 'PERSONNEL',
      action: 'Narrative submitted',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
    },
  ],
} as const;

describe('record contracts', () => {
  it('accepts the full detail and a spare one', () => {
    expect(reportDetailSchema.parse(detail).referenceNo).toBe('AR No. 0001');
    const sparse = reportDetailSchema.parse({
      ...detail,
      people: undefined,
      history: undefined,
      returnEvent: undefined,
    });
    expect(sparse.people).toBeUndefined();
  });

  it('rejects a status the workflow does not have', () => {
    expect(reportDetailSchema.safeParse({ ...detail, status: 'ENDORSED' }).success).toBe(false);
  });

  it('requires an email for every listed person in charge', () => {
    const { pics: _pics, ...rest } = detail.form;
    expect(reportActivitySchema.safeParse({ ...rest, pics: [{ name: 'M. Santos' }] }).success).toBe(
      false,
    );
    expect(
      reportActivitySchema.safeParse({
        ...rest,
        pics: [{ name: 'M. Santos', email: 'santos@buksu.edu.ph' }],
      }).success,
    ).toBe(true);
  });
});

describe('report signature', () => {
  it('accepts either an inline image or the profile copy', () => {
    expect(reportSignatureSchema.parse({ image: 'data:image/png;base64,AAAA' })).toEqual({
      image: 'data:image/png;base64,AAAA',
    });
    expect(reportSignatureSchema.parse({ fromProfile: true })).toEqual({ fromProfile: true });
  });

  it('rejects empty input', () => {
    expect(reportSignatureSchema.safeParse({ image: '' }).success).toBe(false);
    expect(reportSignatureSchema.safeParse({ fromProfile: false }).success).toBe(false);
  });
});

describe('register query', () => {
  it('reads paging from the query string and defaults the rest', () => {
    const parsed = reportListQuerySchema.parse({ size: '50', page: '2' });
    expect(parsed).toMatchObject({ tab: 'all', size: 50, page: 2, sort: 'updated' });
  });

  it('rejects a page size the table cannot show', () => {
    expect(reportListQuerySchema.safeParse({ size: '30' }).success).toBe(false);
  });
});

describe('palette search', () => {
  it('accepts the empty query and rejects one character', () => {
    expect(reportSearchQuerySchema.parse({})).toEqual({ limit: 8 });
    expect(reportSearchQuerySchema.safeParse({ q: 'c' }).success).toBe(false);
  });

  it('names the reference as a match reason', () => {
    const item = {
      id: 'r1',
      referenceNo: 'AR No. 0001',
      title: 'Coastal cleanup',
      type: 'OFF_CAMPUS',
      status: 'SUBMITTED',
      activityStartDate: '2026-03-12',
      activityEndDate: '2026-03-13',
      location: 'Brgy. Poblacion',
      picNames: 'M. Santos',
      updatedAt: '2026-03-14T01:12:00.000Z',
      classification: 'CURRICULAR',
      unitName: 'College of Arts and Sciences',
      matched: 'reference',
    };

    expect(reportSearchResponseSchema.parse({ items: [item] }).items[0]?.matched).toBe('reference');
    expect(
      reportSearchResponseSchema.safeParse({ items: [{ ...item, matched: 'tracking' }] }).success,
    ).toBe(false);
  });
});

describe('printed report', () => {
  it('carries one of the three watermark values', () => {
    expect(
      reportPdfResponseSchema.parse({ url: 'https://signed', watermark: 'NOT_APPROVED' }).watermark,
    ).toBe('NOT_APPROVED');
    expect(
      reportPdfResponseSchema.safeParse({ url: 'https://signed', watermark: 'DRAFTED' }).success,
    ).toBe(false);
  });
});

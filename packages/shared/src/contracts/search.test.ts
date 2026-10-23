import { describe, expect, it } from 'vitest';

import {
  REPOSITORY_PAGE_SIZE,
  repositoryItemSchema,
  repositoryQuerySchema,
  repositoryResponseSchema,
} from './search';

const item = {
  id: 'r1',
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  level: 'UNDERGRADUATE',
  status: 'APPROVED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  picNames: 'M. Santos',
  receivedAt: '2026-03-14T01:12:00.000Z',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
};

describe('repository search contract', () => {
  it('defaults to approved, newest received, 25 rows', () => {
    expect(repositoryQuerySchema.parse({})).toEqual({
      status: 'APPROVED',
      sort: 'received',
      dir: 'desc',
      page: 1,
      size: REPOSITORY_PAGE_SIZE,
    });
  });

  it('never accepts a draft', () => {
    expect(repositoryQuerySchema.safeParse({ status: 'DRAFT' }).success).toBe(false);
    expect(repositoryItemSchema.safeParse({ ...item, status: 'DRAFT' }).success).toBe(false);
  });

  it('accepts the reference filter and the full filter panel', () => {
    const parsed = repositoryQuerySchema.parse({
      q: 'cleanup',
      reference: '0001',
      type: 'OFF_CAMPUS',
      classification: 'NON_CURRICULAR',
      campus: 'c1',
      college: 'un1',
      term: 't1',
      department: 'CAS',
      office: 'Dean',
      level: 'GRADUATE',
      sdg: ['s1', 's2'],
      receivedFrom: '2026-03-01',
      receivedTo: '2026-03-31',
      activityFrom: '2026-03-01',
      activityTo: '2026-03-31',
      pic: 'A. Cruz',
    });

    expect(parsed.reference).toBe('0001');
    expect(parsed.sdg).toEqual(['s1', 's2']);
    expect(parsed.activityTo).toBe('2026-03-31');
  });

  it('carries facets so a saved URL can show an inactive value', () => {
    const parsed = repositoryResponseSchema.parse({
      items: [item],
      total: 212,
      page: 2,
      size: 25,
      facets: {
        campuses: [{ id: 'c1', label: 'Main campus', isActive: true }],
        colleges: [{ id: 'un1', label: 'CAS', isActive: false }],
        terms: [],
        sdgs: [],
      },
    });

    expect(parsed.facets.colleges[0]?.isActive).toBe(false);
  });
});

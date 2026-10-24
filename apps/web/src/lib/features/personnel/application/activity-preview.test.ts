import type { ReportDetail } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  previewAction,
  previewGroups,
  previewNamesFor,
  type PreviewNames,
} from './activity-preview';

const DETAIL: ReportDetail = {
  id: 'report-1',
  referenceNo: 'AR No. 0001',
  createdByUserId: 'admin-1',
  status: 'PENDING',
  version: 2,
  createdAt: '2026-10-20T01:00:00.000Z',
  updatedAt: '2026-10-21T01:00:00.000Z',
  form: {
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'campus-1',
    unitId: 'unit-1',
    department: 'College of Arts and Sciences',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-10-21',
    activityEndDate: '2026-10-23',
    location: 'Brgy. Poblacion, Malaybalay City',
    activityCount: 2,
    totalStudents: 42,
    totalPic: 1,
    pics: [{ id: 'pic-1', name: 'Maria Santos', email: 'santos@buksu.edu.ph' }],
    sdgIds: ['sdg-14', 'sdg-15'],
    narrative: '',
  },
  pics: [{ id: 'pic-1', name: 'Maria Santos', email: 'santos@buksu.edu.ph' }],
  attachments: [],
  receipts: [],
};

const NAMES: PreviewNames = {
  campus: 'Malaybalay Campus',
  unit: 'College of Arts and Sciences',
  sdgs: [
    { id: 'sdg-14', number: 14 },
    { id: 'sdg-15', number: 15 },
  ],
};

describe('previewAction', () => {
  it('offers the narrative for the statuses a PIC may write', () => {
    expect(previewAction({ id: 'r1', status: 'PENDING' })).toEqual({
      label: 'Create narrative report',
      href: '/reports/r1',
    });
    expect(previewAction({ id: 'r1', status: 'RETURNED' }).label).toBe('Create narrative report');
  });

  it('only offers a read for submitted and approved records', () => {
    expect(previewAction({ id: 'r1', status: 'SUBMITTED' }).label).toBe('View record');
    expect(previewAction({ id: 'r1', status: 'APPROVED' }).label).toBe('View record');
  });
});

describe('previewNamesFor', () => {
  it('resolves the ids and keeps the SDG numbers', () => {
    expect(
      previewNamesFor(DETAIL.form, {
        campuses: [{ id: 'campus-1', name: 'Malaybalay Campus' }],
        units: [{ id: 'unit-1', name: 'College of Arts and Sciences' }],
        sdgs: [{ id: 'sdg-14', number: 14 }],
      }),
    ).toEqual({
      campus: 'Malaybalay Campus',
      unit: 'College of Arts and Sciences',
      sdgs: [{ id: 'sdg-14', number: 14 }],
    });
  });

  it('falls back to blank names when a list has not loaded', () => {
    expect(previewNamesFor(DETAIL.form, { campuses: [], units: [], sdgs: [] })).toEqual({
      campus: '',
      unit: '',
      sdgs: [],
    });
  });
});

describe('previewGroups', () => {
  it('reads the activity record into two fact groups', () => {
    const [activity, record] = previewGroups(DETAIL, NAMES);

    expect(activity?.title).toBe('Activity');
    expect(activity?.facts).toEqual(
      expect.arrayContaining([
        { label: 'Type', value: 'Off-campus' },
        { label: 'Classification', value: 'Curricular' },
        { label: 'Campus', value: 'Malaybalay Campus' },
        { label: 'Date of activity', value: '21–23 Oct 2026' },
        { label: 'Total students', value: '42' },
        { label: 'Personnel in charge', value: 'Maria Santos' },
        { label: 'SDGs', value: 'SDG 14, SDG 15' },
      ]),
    );

    expect(record?.facts).toEqual([
      { label: 'AR No.', value: 'AR No. 0001' },
      { label: 'Status', value: 'Pending' },
      { label: 'Submitted by', value: 'Not submitted yet' },
    ]);
  });

  it('names the submitter once the narrative has been submitted', () => {
    const record = previewGroups(
      { ...DETAIL, status: 'SUBMITTED', submittedByName: 'Maria Santos' },
      NAMES,
    )[1];

    expect(record?.facts).toContainEqual({ label: 'Submitted by', value: 'Maria Santos' });
  });
});

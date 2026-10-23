import { describe, expect, it } from 'vitest';

import type { ReportActivityInput } from '../contracts/reports';
import { validateActivity, validateNarrative, validateReport } from './report';

const activity: ReportActivityInput = {
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  campusId: 'campus-1',
  unitId: 'unit-1',
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  activityCount: 2,
  totalStudents: 42,
  totalPic: 1,
  pics: [{ name: 'J. Dela Cruz', email: 'cruz@buksu.edu.ph' }],
  sdgIds: ['sdg-14'],
};

const requirement = {
  activityType: 'OFF_CAMPUS' as const,
  label: 'Attendance sheet',
  minCount: 1,
  isRequired: true,
  isActive: true,
};

describe('validateActivity', () => {
  it('accepts a complete record', () => {
    expect(validateActivity(activity)).toEqual([]);
  });

  it('reports missing fields with the wizard step that owns them', () => {
    const issues = validateActivity({ ...activity, title: '', sdgIds: [] });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'title', step: 2 }),
        expect.objectContaining({ field: 'sdgIds', step: 1 }),
      ]),
    );
  });

  it('rejects an activity that ends before it starts', () => {
    expect(validateActivity({ ...activity, activityEndDate: '2026-03-11' })).toContainEqual(
      expect.objectContaining({ field: 'activityEndDate', step: 2 }),
    );
  });

  it('rejects duplicate PIC emails', () => {
    const pic = { name: 'A', email: 'a@buksu.edu.ph' };
    expect(validateActivity({ ...activity, pics: [pic, pic] })).toContainEqual(
      expect.objectContaining({ field: 'pics', step: 3 }),
    );
  });
});

describe('validateNarrative', () => {
  it('accepts a written narrative', () => {
    expect(validateNarrative('Students cleaned the shoreline.')).toEqual([]);
  });

  it('rejects an empty submission', () => {
    expect(validateNarrative('   ')).toContainEqual(
      expect.objectContaining({ field: 'narrative' }),
    );
  });

  it('names a missing required attachment and blocks a pending upload', () => {
    expect(
      validateNarrative('Text', { attachments: [], requirements: [requirement] }),
    ).toContainEqual(expect.objectContaining({ field: 'attachments' }));
    expect(
      validateNarrative('Text', {
        attachments: [{ label: 'Attendance sheet', status: 'PENDING' }],
        requirements: [requirement],
      }).some((issue) => issue.message.includes('still uploading')),
    ).toBe(true);
  });

  it('ignores an inactive requirement', () => {
    expect(
      validateNarrative('Text', {
        attachments: [],
        requirements: [{ ...requirement, isActive: false }],
      }),
    ).toEqual([]);
  });
});

describe('validateReport', () => {
  it('combines both halves', () => {
    const issues = validateReport({ ...activity, narrative: '' });
    expect(issues).toContainEqual(expect.objectContaining({ field: 'narrative' }));
  });
});

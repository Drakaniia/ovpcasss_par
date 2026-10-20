import { describe, expect, it } from 'vitest';

import type { ReportFormInput } from '../contracts/reports';
import { validateReport } from './report';

const form: ReportFormInput = {
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  campusId: 'campus-1',
  unitId: 'unit-1',
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  totalStudents: 42,
  totalPic: 3,
  pics: [{ name: 'J. Dela Cruz' }],
  sdgIds: ['sdg-14'],
  narrative: 'Students cleaned the shoreline.',
};

const requirement = {
  activityType: 'OFF_CAMPUS' as const,
  label: 'Attendance sheet',
  minCount: 1,
  isRequired: true,
  isActive: true,
};

describe('validateReport', () => {
  it('accepts a complete report with its required attachments', () => {
    const issues = validateReport(form, {
      attachments: [{ label: 'Attendance sheet', status: 'CONFIRMED' }],
      requirements: [requirement],
    });

    expect(issues).toEqual([]);
  });

  it('reports missing fields with the wizard step that owns them', () => {
    const issues = validateReport({ ...form, title: '', sdgIds: [] });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'title', step: 2 }),
        expect.objectContaining({ field: 'sdgIds', step: 3 }),
      ]),
    );
  });

  it('rejects an activity that ends before it starts', () => {
    const issues = validateReport({ ...form, activityEndDate: '2026-03-11' });

    expect(issues).toContainEqual(expect.objectContaining({ field: 'activityEndDate', step: 2 }));
  });

  it('names a missing required attachment', () => {
    const issues = validateReport(form, {
      attachments: [],
      requirements: [requirement],
    });

    expect(issues).toContainEqual(expect.objectContaining({ field: 'attachments', step: 4 }));
  });

  it('blocks while an upload is still pending', () => {
    const issues = validateReport(form, {
      attachments: [{ label: 'Attendance sheet', status: 'PENDING' }],
      requirements: [requirement],
    });

    expect(issues.some((issue) => issue.message.includes('still uploading'))).toBe(true);
  });

  it('ignores an inactive requirement', () => {
    const issues = validateReport(form, {
      attachments: [],
      requirements: [{ ...requirement, isActive: false }],
    });

    expect(issues).toEqual([]);
  });
});

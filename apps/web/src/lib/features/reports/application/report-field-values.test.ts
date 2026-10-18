import type { Campus, Department, Office, ReportDraftForm, Sdg, Unit } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  displayFieldValue,
  FIELD_ORDER,
  flaggedFieldKeys,
  fieldValuesEqual,
  type EditReferences,
} from './report-field-values';

const campus: Campus = {
  id: 'c1',
  code: 'MAIN',
  name: 'Main Campus',
  sortOrder: 1,
  isActive: true,
  isSeeded: true,
};
const unit: Unit = {
  id: 'un1',
  code: 'CAS',
  name: 'College of Arts and Sciences',
  kind: 'COLLEGE',
  campusId: 'c1',
  campusName: 'Main Campus',
  sortOrder: 1,
  isActive: true,
  isSeeded: true,
};
const department: Department = {
  id: 'd1',
  name: 'Registrar',
  sortOrder: 1,
  isActive: true,
  isSeeded: false,
};
const office: Office = department;
const sdg: Sdg = {
  id: 's1',
  number: 4,
  title: 'Quality education',
  isActive: true,
  isSeeded: true,
};

const references: EditReferences = {
  campuses: [campus],
  units: [unit],
  departments: [department],
  offices: [office],
  sdgs: [sdg],
  requirements: [],
};

const form: ReportDraftForm = {
  type: 'OFF_CAMPUS',
  classification: 'NON_CURRICULAR',
  campusId: 'c1',
  unitId: 'un1',
  department: 'Registrar',
  level: 'GRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-12',
  location: 'Brgy. Poblacion',
  totalStudents: 42,
  totalPic: 1,
  pics: [{ name: 'J. Dela Cruz', email: 'jd@example.edu', phone: '0917 000 0000' }],
  sdgIds: ['s1'],
  narrative: 'First paragraph.\n\nSecond paragraph.',
};

describe('flagged field ids', () => {
  it('accepts contract ids and snake_case variants in form order', () => {
    expect(
      flaggedFieldKeys(['narrative', 'activity_start_date', 'totalStudents', 'pics']),
    ).toEqual(['startDate', 'totalStudents', 'pics', 'narrative']);
  });

  it('drops unknown ids instead of guessing a field', () => {
    expect(flaggedFieldKeys(['signature', 'campus'])).toEqual([]);
  });

  it('returns nothing when the API supplies no ids', () => {
    expect(flaggedFieldKeys(undefined)).toEqual([]);
    expect(flaggedFieldKeys([])).toEqual([]);
  });

  it('renders the fields in the official form order', () => {
    expect(FIELD_ORDER[0]).toBe('type');
    expect(FIELD_ORDER.at(-1)).toBe('narrative');
  });
});

describe('display values', () => {
  it('renders official labels and reference names', () => {
    expect(displayFieldValue('type', form, references)).toBe('Off-campus');
    expect(displayFieldValue('classification', form, references)).toBe('Non-curricular');
    expect(displayFieldValue('level', form, references)).toBe('Graduate');
    expect(displayFieldValue('campusId', form, references)).toBe('Main Campus');
    expect(displayFieldValue('unitId', form, references)).toBe(
      'College of Arts and Sciences',
    );
    expect(displayFieldValue('sdgIds', form, references)).toBe('4 Quality education');
  });

  it('formats dates, counts, people, and paragraphs', () => {
    expect(displayFieldValue('startDate', form, references)).toBe('12 Mar 2026');
    expect(displayFieldValue('totalStudents', form, references)).toBe('42');
    expect(displayFieldValue('pics', form, references)).toBe(
      'J. Dela Cruz · jd@example.edu · 0917 000 0000',
    );
    expect(displayFieldValue('narrative', form, references)).toContain('\n\nSecond');
  });

  it('uses an em dash for missing optional values', () => {
    const sparse: ReportDraftForm = {};
    expect(displayFieldValue('office', sparse, references)).toBe('—');
    expect(displayFieldValue('campusId', sparse, references)).toBe('—');
    expect(displayFieldValue('narrative', sparse, references)).toBe('—');
  });
});

describe('value comparison', () => {
  it('ignores padding but not content', () => {
    const padded = { ...form, title: '  Coastal cleanup  ' };
    expect(fieldValuesEqual('title', padded, form)).toBe(true);
    expect(fieldValuesEqual('title', { ...form, title: 'Beach cleanup' }, form)).toBe(false);
  });

  it('compares people row by row', () => {
    const changed = { ...form, pics: [{ name: 'J. Dela Cruz', email: 'other@example.edu' }] };
    expect(fieldValuesEqual('pics', changed, form)).toBe(false);
  });

  it('treats SDG order as irrelevant but membership as content', () => {
    const reordered = { ...form, sdgIds: ['s1'] };
    expect(fieldValuesEqual('sdgIds', reordered, form)).toBe(true);
    expect(fieldValuesEqual('sdgIds', { ...form, sdgIds: [] }, form)).toBe(false);
  });
});

import type { ReportFormInput, Unit } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  emptyWizardForm,
  formFromRecord,
  stepFromParams,
  stepParams,
  toRecordInput,
  unitsForCampus,
  wizardKeyAction,
  type WizardForm,
} from './record-form';

const unit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'u1',
  code: 'CAS',
  name: 'College of Arts and Sciences',
  kind: 'COLLEGE',
  campusId: 'c1',
  campusName: 'Main Campus',
  sortOrder: 1,
  isActive: true,
  isSeeded: true,
  ...overrides,
});

const validForm = (overrides: Partial<WizardForm> = {}): WizardForm => ({
  ...emptyWizardForm(),
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  campusId: 'c1',
  unitId: 'u1',
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  startDate: '2026-03-12',
  startText: '12 Mar 2026',
  endDate: '2026-03-13',
  endText: '13 Mar 2026',
  location: 'Brgy. Poblacion',
  activityCount: '2',
  totalStudents: '42',
  totalPic: '2',
  pics: [
    { id: 'p1', name: 'A. Cruz', email: 'a@univ.edu', phone: '0917 000 0000' },
    { id: 'p2', name: 'B. Reyes', email: 'b@univ.edu', phone: '' },
  ],
  sdgIds: ['s1'],
  ...overrides,
});

const record: ReportFormInput = {
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  campusId: 'c1',
  unitId: 'u1',
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  activityCount: 2,
  totalStudents: 42,
  totalPic: 2,
  pics: [{ name: 'A. Cruz', email: 'a@univ.edu' }],
  sdgIds: ['s1'],
  narrative: '',
};

describe('emptyWizardForm', () => {
  it('starts clean with one PIC row and one activity', () => {
    const form = emptyWizardForm();

    expect(form.type).toBe('');
    expect(form.activityCount).toBe('1');
    expect(form.pics).toHaveLength(1);
    expect(form.sdgIds).toEqual([]);
  });
});

describe('formFromRecord', () => {
  it('restores typed dates, counts, and PIC rows', () => {
    const form = formFromRecord(record);

    expect(form.startText).toBe('12 Mar 2026');
    expect(form.activityCount).toBe('2');
    expect(form.totalStudents).toBe('42');
    expect(form.pics[0]).toMatchObject({ name: 'A. Cruz', email: 'a@univ.edu', phone: '' });
  });
});

describe('toRecordInput', () => {
  it('builds the shared contract once the record is complete', () => {
    const input = toRecordInput(validForm({ department: 'Academic Affairs' }));

    expect(input).toMatchObject({
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      department: 'Academic Affairs',
      activityCount: 2,
      totalStudents: 42,
      totalPic: 2,
      pics: [
        { name: 'A. Cruz', email: 'a@univ.edu', phone: '0917 000 0000' },
        { name: 'B. Reyes', email: 'b@univ.edu' },
      ],
    });
  });

  it('refuses an incomplete record instead of inventing values', () => {
    expect(toRecordInput(emptyWizardForm())).toBeNull();
    expect(toRecordInput(validForm({ activityCount: '0' }))).toBeNull();
    expect(toRecordInput(validForm({ totalStudents: 'many' }))).toBeNull();
    expect(toRecordInput(validForm({ sdgIds: [] }))).toBeNull();
    expect(
      toRecordInput(validForm({ pics: [{ id: 'p1', name: 'A. Cruz', email: '', phone: '' }] })),
    ).toBeNull();
  });

  it('requires an email for every personnel in charge', () => {
    const input = toRecordInput(
      validForm({
        pics: [
          { id: 'p1', name: 'A. Cruz', email: 'a@univ.edu', phone: '' },
          { id: 'p2', name: 'B. Reyes', email: '   ', phone: '' },
        ],
        totalPic: '2',
      }),
    );

    expect(input?.pics).toHaveLength(1);
  });
});

describe('step URL state', () => {
  it('round-trips the step', () => {
    expect(stepParams(1)).toBe('');
    expect(stepParams(3)).toBe('step=3');
    expect(stepFromParams(new URLSearchParams(stepParams(3)))).toBe(3);
  });

  it('falls back to step 1 on unknown values', () => {
    expect(stepFromParams(new URLSearchParams())).toBe(1);
    expect(stepFromParams(new URLSearchParams('step=9'))).toBe(1);
  });
});

describe('options', () => {
  it('filters units by campus and sorts by order', () => {
    const units = [
      unit({ id: 'u2', name: 'College of Nursing', sortOrder: 2 }),
      unit({ id: 'u3', name: 'Other campus unit', campusId: 'c2' }),
      unit({ id: 'u1', name: 'College of Arts and Sciences', sortOrder: 1 }),
    ];

    expect(unitsForCampus(units, 'c1').map((entry) => entry.id)).toEqual(['u1', 'u2']);
    expect(unitsForCampus(units, 'c2').map((entry) => entry.id)).toEqual(['u3']);
  });
});

describe('keyboard intent', () => {
  const key = (overrides: { key: string } & Record<string, unknown>): KeyboardEvent =>
    ({
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      target: null,
      ...overrides,
    }) as KeyboardEvent;

  it('moves steps with Alt+arrow', () => {
    expect(wizardKeyAction(key({ key: 'ArrowRight', altKey: true }), 2)).toEqual({
      kind: 'step',
      step: 3,
    });
    expect(wizardKeyAction(key({ key: 'ArrowLeft', altKey: true }), 2)).toEqual({
      kind: 'step',
      step: 1,
    });
    expect(wizardKeyAction(key({ key: 'ArrowRight', altKey: true }), 3)).toBeNull();
    expect(wizardKeyAction(key({ key: 'ArrowLeft', altKey: true }), 1)).toBeNull();
  });

  it('leaves a bare arrow to the focused field', () => {
    expect(wizardKeyAction(key({ key: 'ArrowRight' }), 2)).toBeNull();
    expect(wizardKeyAction(key({ key: 'ArrowRight', target: { tagName: 'INPUT' } }), 2)).toBeNull();
  });

  it('moves one step per press, not per held key', () => {
    expect(wizardKeyAction(key({ key: 'ArrowRight', altKey: true, repeat: true }), 2)).toBeNull();
  });
});

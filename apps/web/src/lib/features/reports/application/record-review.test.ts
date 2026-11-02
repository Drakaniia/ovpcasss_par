import type { Campus, Sdg, Unit } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { emptyWizardForm, type WizardForm } from './record-form';
import { reviewSections, type ReviewReferences } from './record-review';

const campus = (overrides: Partial<Campus> = {}): Campus => ({
  id: 'c1',
  code: 'MAIN',
  name: 'Main Campus',
  sortOrder: 1,
  isActive: true,
  isSeeded: true,
  ...overrides,
});

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

const sdg = (overrides: Partial<Sdg> = {}): Sdg => ({
  id: 's1',
  number: 4,
  title: 'Quality education',
  isActive: true,
  isSeeded: true,
  ...overrides,
});

const references: ReviewReferences = {
  campuses: [campus()],
  units: [unit()],
  sdgs: [sdg(), sdg({ id: 's2', number: 13, title: 'Climate action' })],
};

const form = (overrides: Partial<WizardForm> = {}): WizardForm => ({
  ...emptyWizardForm(),
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  campusId: 'c1',
  unitId: 'u1',
  department: 'Social Sciences',
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  startDate: '2026-03-12',
  startText: '12 Mar 2026',
  endDate: '2026-03-13',
  endText: '13 Mar 2026',
  locations: ['Brgy. Poblacion', 'Bolinao'],
  activityCount: '2',
  totalStudents: '42',
  totalPic: '1',
  pics: [{ id: 'p1', name: 'A. Cruz', email: 'a@univ.edu', phone: '' }],
  sdgIds: ['s1', 's2'],
  ...overrides,
});

function valueAt(sections: ReturnType<typeof reviewSections>, step: number, label: string): string {
  const row = sections
    .find((section) => section.step === step)
    ?.rows.find((r) => r.label === label);
  return row?.value ?? '';
}

describe('reviewSections', () => {
  it('reads the wizard back as one section per step, in order', () => {
    const sections = reviewSections(form(), references);

    expect(sections.map((section) => section.step)).toEqual([1, 2, 3]);
    expect(sections.map((section) => section.title)).toEqual([
      'Activity classification',
      'Activity',
      'People and hand-over',
    ]);
  });

  it('uses the form labels and names the values behind the ids', () => {
    const sections = reviewSections(form(), references);

    expect(valueAt(sections, 1, 'Activity type')).toBe('Off-campus');
    expect(valueAt(sections, 1, 'Classification')).toBe('Curricular');
    expect(valueAt(sections, 1, 'Campus')).toBe('Main Campus');
    expect(valueAt(sections, 1, 'College or unit')).toBe('College of Arts and Sciences');
    expect(valueAt(sections, 1, 'Level')).toBe('Undergraduate');
  });

  it('shows a blank optional field as an em dash instead of dropping it', () => {
    const sections = reviewSections(
      form({ campusId: '', unitId: '', office: '', type: '', classification: '' }),
      references,
    );

    expect(valueAt(sections, 1, 'Campus')).toBe('—');
    expect(valueAt(sections, 1, 'Office')).toBe('—');
    expect(valueAt(sections, 1, 'Activity type')).toBe('—');
  });

  it('combines the activity dates and lists every venue and SDG', () => {
    const sections = reviewSections(form(), references);

    expect(valueAt(sections, 2, 'Activity dates')).toBe('12–13 Mar 2026');
    expect(valueAt(sections, 2, 'Number of days')).toBe('2');
    expect(valueAt(sections, 2, 'Location')).toBe('Brgy. Poblacion; Bolinao');
    expect(valueAt(sections, 2, 'SDGs')).toBe('4 Quality education, 13 Climate action');
  });

  it('never sends an empty date pair through the date formatter', () => {
    const sections = reviewSections(form({ startDate: '', endDate: '' }), references);

    expect(valueAt(sections, 2, 'Activity dates')).toBe('—');
  });

  it('gives each person in charge one row with the details that will be used', () => {
    const sections = reviewSections(
      form({
        totalPic: '2',
        pics: [
          { id: 'p1', name: 'A. Cruz', email: 'a@univ.edu', phone: '0917 000 0000' },
          { id: 'p2', name: 'B. Reyes', email: '', phone: '' },
        ],
      }),
      references,
    );

    expect(valueAt(sections, 3, 'Total number of PIC')).toBe('2');
    expect(valueAt(sections, 3, 'Person in charge 1')).toBe('A. Cruz · a@univ.edu · 0917 000 0000');
    expect(valueAt(sections, 3, 'Person in charge 2')).toBe('B. Reyes');
  });

  it('keeps a people section even when no row survives', () => {
    const sections = reviewSections(form({ pics: [], totalPic: '0' }), references);

    expect(valueAt(sections, 3, 'People in charge')).toBe('—');
  });
});

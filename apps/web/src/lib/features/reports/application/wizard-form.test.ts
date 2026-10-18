import type { Campus, ReportDraft, Sdg, Unit } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { reviewSections, sdgLabel } from './wizard-review';
import {
  draftFormFromWizard,
  emptyWizardForm,
  formFromDraft,
  isCustomValue,
  stepFromDraft,
  stepFromParams,
  stepParams,
  toReportFormInput,
  unitsForCampus,
  wizardKeyAction,
  wizardPath,
  type WizardForm,
} from './wizard-form';

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
  number: 1,
  title: 'No poverty',
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
  totalStudents: '42',
  totalPic: '2',
  pics: [
    { id: 'p1', name: 'A. Cruz', email: 'a@univ.edu', phone: '0917 000 0000' },
    { id: 'p2', name: 'B. Reyes', email: '', phone: '' },
  ],
  sdgIds: ['s1'],
  narrative: 'The activity gathered students for a coastal cleanup.',
  ...overrides,
});

describe('emptyWizardForm', () => {
  it('starts clean with one PIC row', () => {
    const form = emptyWizardForm();

    expect(form.type).toBe('');
    expect(form.pics).toHaveLength(1);
    expect(form.pics[0].name).toBe('');
    expect(form.sdgIds).toEqual([]);
  });
});

describe('formFromDraft', () => {
  it('restores typed dates, counts, and PIC rows', () => {
    const draft: ReportDraft = {
      id: 'd1',
      version: 1,
      updatedAt: '2026-03-15T01:12:00.000Z',
      form: {
        type: 'IN_CAMPUS',
        classification: 'NON_CURRICULAR',
        campusId: 'c1',
        unitId: 'u1',
        level: 'GRADUATE',
        title: 'Lecture series',
        activityStartDate: '2026-03-12',
        activityEndDate: '2026-03-12',
        location: 'Gymnasium',
        totalStudents: 10,
        totalPic: 1,
        pics: [{ name: 'A. Cruz', email: 'a@univ.edu' }],
        sdgIds: ['s1'],
        narrative: 'Summary',
      },
    };

    const form = formFromDraft(draft.form);

    expect(form.startText).toBe('12 Mar 2026');
    expect(form.endText).toBe('12 Mar 2026');
    expect(form.totalStudents).toBe('10');
    expect(form.pics).toHaveLength(1);
    expect(form.pics[0]).toMatchObject({ name: 'A. Cruz', email: 'a@univ.edu', phone: '' });
  });

  it('keeps one empty PIC row for a draft that has none', () => {
    const form = formFromDraft({ title: 'Untitled' });

    expect(form.pics).toHaveLength(1);
    expect(form.startText).toBe('');
  });
});

describe('draftFormFromWizard', () => {
  it('drops empty values and stores counts as numbers', () => {
    const draft = draftFormFromWizard({
      ...validForm(),
      department: '  ',
      office: 'Registrar',
      totalStudents: '42',
    });

    expect(draft).toMatchObject({
      type: 'OFF_CAMPUS',
      office: 'Registrar',
      totalStudents: 42,
    });
    expect(draft.department).toBeUndefined();
    expect(draft.pics?.[1]).toEqual({ name: 'B. Reyes' });
  });

  it('round-trips through formFromDraft without losing values', () => {
    const original = validForm();
    const restored = formFromDraft(draftFormFromWizard(original));

    expect(restored.type).toBe(original.type);
    expect(restored.classification).toBe(original.classification);
    expect(restored.title).toBe(original.title);
    expect(restored.startDate).toBe(original.startDate);
    expect(restored.pics.map((pic) => pic.name)).toEqual(['A. Cruz', 'B. Reyes']);
    expect(restored.sdgIds).toEqual(['s1']);
  });
});

describe('toReportFormInput', () => {
  it('builds the shared contract once the form is complete', () => {
    const input = toReportFormInput(validForm({ department: 'Academic Affairs' }));

    expect(input).toMatchObject({
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      department: 'Academic Affairs',
      totalStudents: 42,
      totalPic: 2,
      pics: [
        { name: 'A. Cruz', email: 'a@univ.edu', phone: '0917 000 0000' },
        { name: 'B. Reyes' },
      ],
    });
  });

  it('refuses an incomplete form instead of inventing values', () => {
    expect(toReportFormInput(emptyWizardForm())).toBeNull();
    expect(toReportFormInput(validForm({ narrative: '   ' }))).toBeNull();
    expect(toReportFormInput(validForm({ totalStudents: 'many' }))).toBeNull();
  });
});

describe('step URL state', () => {
  it('round-trips the step and draft id', () => {
    expect(stepParams(1)).toBe('');
    expect(stepParams(3)).toBe('step=3');
    expect(stepParams(3, 'd1')).toBe('step=3&draft=d1');
    expect(stepFromParams(new URLSearchParams(stepParams(4, 'd1')))).toBe(4);
  });

  it('falls back to step 1 on unknown values', () => {
    expect(stepFromParams(new URLSearchParams())).toBe(1);
    expect(stepFromParams(new URLSearchParams('step=9'))).toBe(1);
    expect(stepFromParams(new URLSearchParams('step=nope'))).toBe(1);
    expect(stepFromDraft(0)).toBe(1);
    expect(stepFromDraft(2)).toBe(2);
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

  it('recognises a value that belongs in Other (specify)', () => {
    const options = [
      { value: 'Registrar', label: 'Registrar' },
      { value: 'HR', label: 'Human Resources' },
    ];

    expect(isCustomValue('', options)).toBe(false);
    expect(isCustomValue('Registrar', options)).toBe(false);
    expect(isCustomValue('Alumni Office', options)).toBe(true);
  });
});

describe('review summary', () => {
  const references = {
    campuses: [campus()],
    units: [unit()],
    sdgs: [sdg(), sdg({ id: 's2', number: 4, title: 'Quality education' })],
  };

  it('lists every section with its step and form labels', () => {
    const sections = reviewSections(validForm(), references, '1 file');

    expect(sections.map((section) => section.step)).toEqual([1, 2, 3, 4]);
    expect(sections[0].rows).toContainEqual({ label: 'Campus', value: 'Main Campus' });
    expect(sections[0].rows).toContainEqual({
      label: 'College or unit',
      value: 'College of Arts and Sciences',
    });
    expect(sections[1].rows).toContainEqual({
      label: 'Date of the activity',
      value: '12–13 Mar 2026',
    });
    expect(sections[2].rows).toContainEqual({
      label: 'SDGs',
      value: '1 No poverty',
    });
    expect(sections[3].rows).toContainEqual({ label: 'Attachments', value: '1 file' });
  });

  it('labels PIC contact details and falls back to an em dash', () => {
    const sections = reviewSections(validForm({ sdgIds: [] }), references);

    expect(sections[2].rows).toContainEqual({
      label: 'Person in charge 1',
      value: 'A. Cruz — a@univ.edu · 0917 000 0000',
    });
    expect(sections[2].rows).toContainEqual({ label: 'SDGs', value: '—' });
  });

  it('keeps the SDG number in the label', () => {
    expect(sdgLabel(sdg())).toBe('1 No poverty');
  });

  it('truncates a long narrative', () => {
    const sections = reviewSections(validForm({ narrative: 'x'.repeat(200) }), references);
    const value = sections[3].rows[0].value;

    expect(value.endsWith('…')).toBe(true);
    expect(value.length).toBeLessThanOrEqual(161);
  });
});

describe('step routes', () => {
  it('keeps a new report on /reports/new', () => {
    expect(wizardPath(1)).toBe('/reports/new');
    expect(wizardPath(2, 'draft-1')).toBe('/reports/new?step=2&draft=draft-1');
  });

  it('keeps a resumed draft on its own route (spec §7.4)', () => {
    expect(wizardPath(3, '', '/reports/r1/edit')).toBe('/reports/r1/edit?step=3');
    expect(wizardPath(1, '', '/reports/r1/edit')).toBe('/reports/r1/edit');
  });
});

describe('keyboard intent', () => {
  const key = (overrides: { key: string } & Record<string, unknown>): KeyboardEvent =>
    ({ metaKey: false, ctrlKey: false, altKey: false, target: null, ...overrides }) as KeyboardEvent;

  it('saves on Ctrl/Cmd+S', () => {
    expect(wizardKeyAction(key({ key: 's', ctrlKey: true }), 2)).toEqual({ kind: 'save' });
    expect(wizardKeyAction(key({ key: 'S', metaKey: true }), 2)).toEqual({ kind: 'save' });
  });

  it('moves steps with Alt+arrow', () => {
    expect(wizardKeyAction(key({ key: 'ArrowRight', altKey: true }), 2)).toEqual({
      kind: 'step',
      step: 3,
    });
    expect(wizardKeyAction(key({ key: 'ArrowLeft', altKey: true }), 2)).toEqual({
      kind: 'step',
      step: 1,
    });
    expect(wizardKeyAction(key({ key: 'ArrowRight', altKey: true }), 4)).toBeNull();
    expect(wizardKeyAction(key({ key: 'ArrowLeft', altKey: true }), 1)).toBeNull();
  });

  it('leaves the narrative editor to the arrows', () => {
    const inEditor = key({ key: 'ArrowRight', altKey: true, target: { tagName: 'TEXTAREA' } });
    expect(wizardKeyAction(inEditor, 2)).toBeNull();
  });
});

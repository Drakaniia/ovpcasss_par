import type { AttachmentRequirement } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  attachmentBlockReason,
  completenessItems,
  completenessSummary,
  labelOptionsFor,
  requirementProgress,
  type CompletenessAttachment,
} from './wizard-completeness';
import { emptyWizardForm, type WizardForm } from './wizard-form';
import {
  clearErrorsForPatch,
  errorSummary,
  fieldDomId,
  fieldFromDomId,
  firstErrorField,
  firstInvalidStep,
  validateField,
  validateStep,
} from './wizard-validation';

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

const requirement = (overrides: Partial<AttachmentRequirement> = {}): AttachmentRequirement => ({
  id: 'r1',
  activityType: 'OFF_CAMPUS',
  label: 'Attendance sheet',
  minCount: 2,
  isRequired: true,
  isActive: true,
  isSeeded: true,
  ...overrides,
});

const confirmed = (label: string): CompletenessAttachment => ({
  label,
  status: 'CONFIRMED',
});

describe('step 1 validation', () => {
  it('requires type, classification, campus, unit, and level', () => {
    const errors = validateStep(1, emptyWizardForm());

    expect(Object.keys(errors).sort()).toEqual([
      'campusId',
      'classification',
      'level',
      'type',
      'unitId',
    ]);
    expect(errors.type).toBe('Select the activity type.');
  });

  it('accepts a complete classification and leaves optional fields alone', () => {
    expect(validateStep(1, validForm({ department: '', office: '' }))).toEqual({});
  });
});

describe('step 2 validation', () => {
  it('requires title, both dates, and location', () => {
    const errors = validateStep(2, emptyWizardForm());

    expect(errors.title).toBe('Enter the title of the activity.');
    expect(errors.startDate).toBe('Enter the date.');
    expect(errors.endDate).toBe('Enter the date.');
    expect(errors.location).toBe('Enter the location.');
  });

  it('rejects unparseable typed dates', () => {
    const errors = validateStep(
      2,
      validForm({ startText: 'March 12', startDate: '', endText: '13 Mar 2026' }),
    );

    expect(errors.startDate).toBe('Enter the date as DD MMM YYYY.');
  });

  it('catches an end date before the start date', () => {
    const errors = validateStep(2, validForm({ endDate: '2026-03-11', endText: '11 Mar 2026' }));

    expect(errors.endDate).toBe('The end date must be on or after the start date.');
  });

  it('allows a single-day activity', () => {
    const errors = validateStep(2, validForm({ endDate: '2026-03-12', endText: '12 Mar 2026' }));

    expect(errors).toEqual({});
  });
});

describe('step 3 validation', () => {
  it('requires counts, names, and at least one SDG', () => {
    const errors = validateStep(3, {
      ...emptyWizardForm(),
      pics: [{ id: 'p1', name: '', email: '', phone: '' }],
    });

    expect(errors.totalStudents).toBe('Enter the total number of students.');
    expect(errors.totalPic).toBe('Enter the total number of PIC.');
    expect(errors['pic.p1.name']).toBe('Enter the name.');
    expect(errors.sdgIds).toBe('Select at least one SDG.');
  });

  it('validates email format and phone characters only when supplied', () => {
    const errors = validateStep(
      3,
      validForm({
        pics: [
          { id: 'p1', name: 'A. Cruz', email: 'not-an-email', phone: 'call me' },
          { id: 'p2', name: 'B. Reyes', email: '', phone: '' },
        ],
      }),
    );

    expect(errors['pic.p1.email']).toBe('Enter a valid email address.');
    expect(errors['pic.p1.phone']).toBe('Use digits, spaces, +, -, and parentheses.');
    expect(errors['pic.p2.email']).toBeUndefined();
  });

  it('reports a PIC count that does not match the rows', () => {
    const errors = validateStep(3, validForm({ totalPic: '3' }));

    expect(errors.totalPic).toBe('The PIC count does not match the number of PIC rows.');
  });

  it('accepts a complete step', () => {
    expect(validateStep(3, validForm())).toEqual({});
  });
});

describe('step 4 validation', () => {
  it('requires a narrative', () => {
    expect(validateStep(4, validForm({ narrative: '   ' })).narrative).toBe('Enter the narrative.');
  });

  it('accepts a complete narrative', () => {
    expect(validateStep(4, validForm())).toEqual({});
  });
});

describe('blur validation', () => {
  it('reports one field at a time with the same message as the step', () => {
    expect(validateField('title', validForm({ title: '  ' }))).toBe(
      'Enter the title of the activity.',
    );
    expect(validateField('title', validForm())).toBeUndefined();
    expect(validateField('email', validForm())).toBeUndefined();
  });

  it('catches an end date before the start date on the end date alone', () => {
    const form = validForm({ startDate: '2026-03-13', endDate: '2026-03-12' });

    expect(validateField('endDate', form)).toBe('The end date must be on or after the start date.');
    expect(validateField('startDate', form)).toBeUndefined();
  });

  it('validates a PIC row by id', () => {
    const form = validForm({
      pics: [{ id: 'p1', name: '', email: 'not-an-email', phone: 'abc' }],
      totalPic: '1',
    });

    expect(validateField('pic.p1.name', form)).toBe('Enter the name.');
    expect(validateField('pic.p1.email', form)).toBe('Enter a valid email address.');
    expect(validateField('pic.p1.phone', form)).toBe('Use digits, spaces, +, -, and parentheses.');
  });

  it('maps a control id back to its field, including Other (specify)', () => {
    expect(fieldFromDomId('wiz-title')).toBe('title');
    expect(fieldFromDomId('wiz-pic-p1-email')).toBe('pic.p1.email');
    expect(fieldFromDomId('wiz-department-other')).toBe('department');
    expect(fieldFromDomId('search')).toBeNull();
  });
});

describe('error clearing on edit', () => {
  it('drops the errors an edit invalidates and keeps the rest', () => {
    const errors = { title: 'Enter the title of the activity.', endDate: 'Enter the date.' };
    const next = clearErrorsForPatch(errors, { title: 'Coastal cleanup' });

    expect(next.title).toBeUndefined();
    expect(next.endDate).toBe('Enter the date.');
    expect(errors.title).toBe('Enter the title of the activity.');
  });

  it('clears PIC row errors when the rows themselves change', () => {
    const next = clearErrorsForPatch(
      { 'pic.p1.name': 'Enter the name.', totalPic: 'The PIC count does not match.' },
      { pics: [] },
    );

    expect(next).toEqual({});
  });
});

describe('whole-form validation', () => {
  it('names the first invalid step', () => {
    expect(firstInvalidStep(emptyWizardForm())?.step).toBe(1);
    expect(firstInvalidStep(validForm())).toBeNull();
  });

  it('lists errors in form order with readable labels', () => {
    const form = validForm({ title: '', startDate: '', startText: '' });
    const errors = { ...validateStep(2, form), ...validateStep(3, form) };
    const summary = errorSummary(form, errors);

    expect(summary[0]).toEqual({
      field: 'title',
      label: 'Title of the activity',
      message: 'Enter the title of the activity.',
    });
    expect(firstErrorField(form, errors)).toBe('title');
  });

  it('labels a PIC row error by its position', () => {
    const form = validForm({
      pics: [{ id: 'p1', name: '', email: '', phone: '' }],
      totalPic: '1',
    });
    const summary = errorSummary(form, validateStep(3, form));

    expect(summary).toContainEqual({
      field: 'pic.p1.name',
      label: 'Name of person in charge 1',
      message: 'Enter the name.',
    });
  });

  it('builds DOM ids for fields and PIC rows', () => {
    expect(fieldDomId('title')).toBe('wiz-title');
    expect(fieldDomId('pic.p1.email')).toBe('wiz-pic-p1-email');
  });
});

describe('attachment requirements', () => {
  it('counts confirmed attachments against required labels', () => {
    const progress = requirementProgress(
      [requirement(), requirement({ id: 'r2', label: 'Photos', minCount: 0, isRequired: false })],
      [confirmed('Attendance sheet')],
      'OFF_CAMPUS',
    );

    expect(progress.confirmedTotal).toBe(1);
    expect(progress.requiredTotal).toBe(2);
    expect(progress.missingLabels).toEqual(['Attendance sheet']);
    expect(progress.complete).toBe(false);
  });

  it('ignores inactive requirements and other activity types', () => {
    const progress = requirementProgress(
      [
        requirement({ id: 'r2', isActive: false }),
        requirement({ id: 'r3', activityType: 'IN_CAMPUS' }),
      ],
      [],
      'OFF_CAMPUS',
    );

    expect(progress.requiredTotal).toBe(0);
    expect(progress.missingLabels).toEqual([]);
  });

  it('is complete only when every attachment is Confirmed', () => {
    const requirements = [requirement({ minCount: 1 })];
    const done = requirementProgress(requirements, [confirmed('Attendance sheet')], 'OFF_CAMPUS');
    const pending = requirementProgress(
      requirements,
      [{ label: 'Attendance sheet', status: 'PENDING' }],
      'OFF_CAMPUS',
    );

    expect(done.complete).toBe(true);
    expect(pending.complete).toBe(false);
  });

  it('offers distinct labels for the uploader', () => {
    expect(
      labelOptionsFor(
        [
          requirement({ label: 'Photos', minCount: 1 }),
          requirement({ id: 'r2', label: 'Attendance sheet' }),
          requirement({ id: 'r3', label: 'Photos', minCount: 2 }),
        ],
        'OFF_CAMPUS',
      ),
    ).toEqual(['Attendance sheet', 'Photos']);
  });
});

describe('completeness checklist', () => {
  it('renders the fixed items with the attachment denominator', () => {
    const items = completenessItems(validForm(), [requirement()], [confirmed('Attendance sheet')]);

    expect(items.map((item) => item.id)).toEqual([
      'type',
      'campus',
      'dates',
      'narrative',
      'attachments',
    ]);
    expect(items[4].label).toBe('Attachments (1/2)');
    expect(items[4].missing).toEqual(['Attendance sheet']);
    expect(items[4].complete).toBe(false);
  });

  it('summarises progress as completed of total', () => {
    const items = completenessItems(
      validForm(),
      [requirement({ minCount: 1 })],
      [confirmed('Attendance sheet')],
    );
    const summary = completenessSummary(items);

    expect(summary).toMatchObject({ complete: 5, total: 5, text: '5 of 5 complete' });
    expect(summary.missing).toEqual([]);
  });

  it('marks missing dates and narrative as incomplete', () => {
    const items = completenessItems(
      validForm({ startDate: '', endDate: '', narrative: '' }),
      [],
      [],
    );
    const summary = completenessSummary(items);

    expect(summary.complete).toBe(3);
    expect(summary.missing.map((item) => item.id)).toEqual(['dates', 'narrative']);
  });
});

describe('submit block reason', () => {
  it('explains uploading and failed attachments next to Submit', () => {
    expect(
      attachmentBlockReason([
        confirmed('Attendance sheet'),
        { label: 'Photos', status: 'UPLOADING' },
      ]),
    ).toBe(
      '1 attachment is still uploading. Submit is available once every attachment is Confirmed.',
    );

    expect(attachmentBlockReason([{ label: 'Photos', status: 'FAILED' }])).toBe(
      '1 attachment has not uploaded. Retry or remove them before submitting.',
    );
  });

  it('has no reason when every attachment is Confirmed', () => {
    expect(attachmentBlockReason([confirmed('Photos')])).toBeUndefined();
    expect(attachmentBlockReason([])).toBeUndefined();
  });
});

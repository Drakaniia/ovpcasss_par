import type { ValidationIssue } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { emptyWizardForm, type WizardForm } from './record-form';
import { errorsFromIssues, validateField, validateStep } from './record-validation';

/**
 * Phase 10: a second person in charge is a second account, so two rows can
 * never share an email — and a rejected save names the row it refused.
 */
const form = (emails: readonly [string, string]): WizardForm => ({
  ...emptyWizardForm(),
  totalPic: '2',
  pics: [
    { id: 'p1', name: 'A. Cruz', email: emails[0], phone: '' },
    { id: 'p2', name: 'B. Reyes', email: emails[1], phone: '' },
  ],
});

describe('optional classification fields', () => {
  it('lets step 1 continue without campus, college, department, or office', () => {
    const value: WizardForm = {
      ...emptyWizardForm(),
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      level: 'UNDERGRADUATE',
    };

    expect(validateStep(1, value)).toEqual({});
    expect(validateField('campusId', value)).toBeUndefined();
    expect(validateField('unitId', value)).toBeUndefined();
    expect(validateField('department', value)).toBeUndefined();
    expect(validateField('office', value)).toBeUndefined();
  });
});

describe('PIC email rules', () => {
  it('accepts two different addresses', () => {
    const value = form(['a@univ.edu', 'b@univ.edu']);

    expect(validateField('pic.p1.email', value)).toBeUndefined();
    expect(validateField('pic.p2.email', value)).toBeUndefined();
    expect(validateStep(3, value)).not.toHaveProperty('pic.p2.email');
  });

  it('flags the repeat on both rows, ignoring case and padding', () => {
    const value = form(['a@univ.edu', ' A@Univ.edu ']);
    const message = 'This email is already used by another person in charge.';

    expect(validateField('pic.p1.email', value)).toBe(message);
    expect(validateField('pic.p2.email', value)).toBe(message);

    const errors = validateStep(3, value);
    expect(errors['pic.p1.email']).toBe(message);
    expect(errors['pic.p2.email']).toBe(message);
  });

  it('keeps the address format check ahead of the repeat check', () => {
    const value = form(['not-an-address', 'not-an-address']);

    expect(validateField('pic.p1.email', value)).toBe('Enter a valid email address.');
  });
});

describe('location rows', () => {
  it('accepts any filled row and flags a list with no venue', () => {
    const value: WizardForm = { ...emptyWizardForm(), locations: ['', 'Brgy. Poblacion', ' '] };

    expect(validateField('locations', value)).toBeUndefined();
    expect(validateField('locations', emptyWizardForm())).toBe('Enter at least one location.');
  });

  it('flags a combined list past the contract limit', () => {
    const value: WizardForm = {
      ...emptyWizardForm(),
      locations: ['a'.repeat(151), 'b'.repeat(151)],
    };

    expect(validateField('locations', value)).toBe(
      'Keep the combined locations within 300 characters.',
    );
  });

  it('puts a location the API refused on the venue field', () => {
    const issues: ValidationIssue[] = [
      { field: 'location', message: 'Enter at least one location.', step: 2 },
    ];

    expect(errorsFromIssues(issues, emptyWizardForm())).toEqual({
      errors: { locations: 'Enter at least one location.' },
      step: 2,
    });
  });
});

describe('errorsFromIssues', () => {
  it('puts a row issue on the row id the wizard holds', () => {
    const value = form(['a@univ.edu', 'b@univ.edu']);
    const issues: ValidationIssue[] = [
      { field: 'pics.1.email', message: 'Use a different address.', step: 3 },
    ];

    expect(errorsFromIssues(issues, value)).toEqual({
      errors: { 'pic.p2.email': 'Use a different address.' },
      step: 3,
    });
  });

  it('maps the record contract names onto the wizard keys', () => {
    const value = form(['a@univ.edu', 'b@univ.edu']);
    const issues: ValidationIssue[] = [
      { field: 'activityStartDate', message: 'Enter a valid start date.', step: 2 },
      { field: 'activityEndDate', message: 'Enter a valid end date.', step: 2 },
    ];

    expect(errorsFromIssues(issues, value)).toEqual({
      errors: {
        startDate: 'Enter a valid start date.',
        endDate: 'Enter a valid end date.',
      },
      step: 2,
    });
  });

  it('keeps a row-set issue on the list and reports the earliest step', () => {
    const value = form(['a@univ.edu', 'b@univ.edu']);
    const issues: ValidationIssue[] = [
      { field: 'pics', message: 'Each personnel in charge must have a different email address.' },
      { field: 'level', message: 'Select the level.' },
    ];

    expect(errorsFromIssues(issues, value)).toEqual({
      errors: {
        pics: 'Each personnel in charge must have a different email address.',
        level: 'Select the level.',
      },
      step: 1,
    });
  });

  it('falls back to the row list when the server counts more rows than the form holds', () => {
    const value = form(['a@univ.edu', 'b@univ.edu']);
    const issues: ValidationIssue[] = [
      { field: 'pics.7.name', message: 'Enter the name.', step: 3 },
    ];

    expect(errorsFromIssues(issues, value)).toEqual({
      errors: { pics: 'Enter the name.' },
      step: 3,
    });
  });

  it('ignores a field the wizard does not show', () => {
    const value = form(['a@univ.edu', 'b@univ.edu']);

    expect(errorsFromIssues([{ field: 'narrative', message: 'Write it.' }], value)).toEqual({
      errors: {},
      step: undefined,
    });
  });
});

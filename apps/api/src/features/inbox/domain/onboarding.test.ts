import { describe, expect, it } from 'vitest';

import { isProfileComplete } from './onboarding';

const complete = {
  fullName: 'J. Dela Cruz',
  campusUnit: 'College of Arts and Sciences',
  contactNumber: '0917 000 0000',
};

describe('isProfileComplete', () => {
  it('is complete when name, campus/unit, and contact number are all present', () => {
    expect(isProfileComplete(complete)).toBe(true);
  });

  it('is incomplete when either optional field is missing or blank', () => {
    expect(isProfileComplete({ ...complete, campusUnit: null })).toBe(false);
    expect(isProfileComplete({ ...complete, contactNumber: '   ' })).toBe(false);
  });

  it('is incomplete without a name', () => {
    expect(isProfileComplete({ ...complete, fullName: '' })).toBe(false);
  });
});

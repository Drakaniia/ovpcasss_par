import { describe, expect, it } from 'vitest';

import { isBootstrapAdmin, parseBootstrapAdmins } from './config';

describe('parseBootstrapAdmins', () => {
  it('splits on commas, trims, and lowercases', () => {
    expect(
      parseBootstrapAdmins(' OVPCASSS@buksu.edu.ph , 2401117078@student.buksu.edu.ph '),
    ).toEqual(['ovpcasss@buksu.edu.ph', '2401117078@student.buksu.edu.ph']);
  });

  it('drops blank entries', () => {
    expect(parseBootstrapAdmins('a@buksu.edu.ph,, ')).toEqual(['a@buksu.edu.ph']);
  });

  it('returns nothing when the variable is not set', () => {
    expect(parseBootstrapAdmins(undefined)).toEqual([]);
    expect(parseBootstrapAdmins('')).toEqual([]);
  });
});

describe('isBootstrapAdmin', () => {
  const admins = parseBootstrapAdmins('ovpcasss@buksu.edu.ph,2401117078@student.buksu.edu.ph');

  it('matches an address regardless of case or surrounding space', () => {
    expect(isBootstrapAdmin(' OVPCASSS@buksu.edu.ph ', admins)).toBe(true);
  });

  it('does not match an address that is not listed', () => {
    expect(isBootstrapAdmin('someone@buksu.edu.ph', admins)).toBe(false);
    expect(isBootstrapAdmin('ovpcasss@student.buksu.edu.ph', admins)).toBe(false);
  });
});

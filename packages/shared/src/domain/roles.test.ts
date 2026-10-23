import { describe, expect, it } from 'vitest';

import { ROLES } from './enums';
import { actsAs } from './roles';

describe('actsAs', () => {
  it('matches the role itself for every role', () => {
    for (const role of ROLES) expect(actsAs(role, role)).toBe(true);
  });

  it('lets an admin stand in for the office role', () => {
    expect(actsAs('ADMIN', 'PERSONNEL')).toBe(true);
  });

  it('does not let personnel act as the office', () => {
    expect(actsAs('PERSONNEL', 'ADMIN')).toBe(false);
  });

  it('matches nothing when no role is assigned', () => {
    for (const role of ROLES) expect(actsAs(null, role)).toBe(false);
    expect(actsAs(undefined, 'PERSONNEL')).toBe(false);
  });
});

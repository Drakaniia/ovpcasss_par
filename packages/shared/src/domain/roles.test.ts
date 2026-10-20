import { describe, expect, it } from 'vitest';

import { ROLES } from './enums';
import { actsAs } from './roles';

describe('actsAs', () => {
  it('matches the role itself for every role', () => {
    for (const role of ROLES) expect(actsAs(role, role)).toBe(true);
  });

  it('lets an admin stand in for every role', () => {
    for (const role of ROLES) expect(actsAs('ADMIN', role)).toBe(true);
  });

  it('does not let another role stand in for one it does not hold', () => {
    expect(actsAs('SUBMITTER', 'REVIEWER')).toBe(false);
    expect(actsAs('REVIEWER', 'APPROVER')).toBe(false);
    expect(actsAs('APPROVER', 'SUBMITTER')).toBe(false);
  });

  it('matches nothing when no role is assigned', () => {
    for (const role of ROLES) expect(actsAs(null, role)).toBe(false);
    expect(actsAs(undefined, 'SUBMITTER')).toBe(false);
  });
});

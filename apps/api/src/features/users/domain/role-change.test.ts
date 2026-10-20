import { describe, expect, it } from 'vitest';

import { roleLabel, statusAfterRoleAssignment } from './role-change';

describe('statusAfterRoleAssignment', () => {
  it('activates an account that was waiting for a role', () => {
    expect(statusAfterRoleAssignment('PENDING_ROLE')).toBe('ACTIVE');
  });

  it('leaves every other status untouched', () => {
    expect(statusAfterRoleAssignment('ACTIVE')).toBe('ACTIVE');
    expect(statusAfterRoleAssignment('DISABLED')).toBe('DISABLED');
    expect(statusAfterRoleAssignment('PENDING_VERIFICATION')).toBe('PENDING_VERIFICATION');
  });
});

describe('roleLabel', () => {
  it('renders the role enum as the office writes it', () => {
    expect(roleLabel('REVIEWER')).toBe('Reviewer');
    expect(roleLabel('ADMIN')).toBe('Admin');
  });
});

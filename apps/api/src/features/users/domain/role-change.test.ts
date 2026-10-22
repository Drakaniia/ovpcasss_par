import { describe, expect, it } from 'vitest';

import { roleLabel } from './role-change';

describe('roleLabel', () => {
  it('renders the role enum as the office writes it', () => {
    expect(roleLabel('REVIEWER')).toBe('Reviewer');
    expect(roleLabel('ADMIN')).toBe('Admin');
  });
});

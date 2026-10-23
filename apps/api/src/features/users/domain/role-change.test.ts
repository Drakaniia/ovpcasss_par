import { describe, expect, it } from 'vitest';

import { roleLabel } from './role-change';

describe('roleLabel', () => {
  it('renders the role enum as the office writes it', () => {
    expect(roleLabel('PERSONNEL')).toBe('Personnel');
    expect(roleLabel('ADMIN')).toBe('Admin');
  });
});

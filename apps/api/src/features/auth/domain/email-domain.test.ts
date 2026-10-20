import { describe, expect, it } from 'vitest';

import { isAllowedDomain } from './email-domain';

describe('isAllowedDomain', () => {
  it('accepts any address when no domains are configured', () => {
    expect(isAllowedDomain('anyone@example.com', [])).toBe(true);
  });

  it('matches the email domain case-insensitively', () => {
    expect(isAllowedDomain('Juan.DelaCruz@University.edu', ['university.edu'])).toBe(true);
  });

  it('ignores a leading @ and surrounding space in configured entries', () => {
    expect(isAllowedDomain('juan@ovpcassss.edu.ph', ['@ovpcassss.edu.ph'])).toBe(true);
    expect(isAllowedDomain('juan@ovpcassss.edu.ph', [' ovpcassss.edu.ph '])).toBe(true);
  });

  it('rejects an address on a domain that is not listed', () => {
    expect(isAllowedDomain('juan@gmail.com', ['university.edu'])).toBe(false);
  });

  it('rejects a value that is not an address', () => {
    expect(isAllowedDomain('not-an-email', ['university.edu'])).toBe(false);
  });

  it('compares against the last @ of a malformed address', () => {
    expect(isAllowedDomain('a@b@university.edu', ['university.edu'])).toBe(true);
  });
});

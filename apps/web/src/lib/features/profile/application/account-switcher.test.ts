import { describe, expect, it } from 'vitest';

import { loginHref, prefillEmail, switchStep } from './account-switcher';

describe('switchStep', () => {
  it('restores a swapped desktop token', () => {
    expect(switchStep('desktop', 'switched')).toBe('restore');
  });

  it('reports an expired desktop session', () => {
    expect(switchStep('desktop', 'failed')).toBe('expired');
    expect(switchStep('desktop', 'sign-in')).toBe('expired');
  });

  it('always returns to sign-in in the browser', () => {
    expect(switchStep('web', 'sign-in')).toBe('sign-in');
    expect(switchStep('web', 'failed')).toBe('sign-in');
  });
});

describe('loginHref', () => {
  it('encodes the address into the sign-in link', () => {
    expect(loginHref(' msantos@buksu.edu.ph ')).toBe(
      '/login?email=msantos%40buksu.edu.ph',
    );
  });

  it('falls back to the plain sign-in page', () => {
    expect(loginHref('')).toBe('/login');
  });
});

describe('prefillEmail', () => {
  it('reads the address from the query', () => {
    expect(prefillEmail('?email=a%40b.edu.ph')).toBe('a@b.edu.ph');
  });

  it('ignores a missing or blank value and bounds the length', () => {
    expect(prefillEmail('')).toBe('');
    expect(prefillEmail('?email=%20%20')).toBe('');
    expect(prefillEmail(`?email=${'a'.repeat(300)}`)).toHaveLength(254);
  });
});

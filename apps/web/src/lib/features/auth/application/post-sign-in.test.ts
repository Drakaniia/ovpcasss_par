import type { Account } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { destinationAfterSignIn } from './post-sign-in';

const account = (overrides: Partial<Account>): Account => ({
  id: 'user-1',
  email: 'juan.delacruz@university.edu',
  fullName: 'Juan Dela Cruz',
  role: null,
  status: 'ACTIVE',
  ...overrides,
});

describe('destinationAfterSignIn', () => {
  it('sends an active account to the work inbox', () => {
    expect(destinationAfterSignIn(account({ role: 'SUBMITTER', status: 'ACTIVE' }))).toBe('/');
  });

  it('sends a pending-role account to the status page', () => {
    expect(destinationAfterSignIn(account({ status: 'PENDING_ROLE' }))).toBe('/awaiting-approval');
  });

  it('sends an unverified account to the verify screen with the address', () => {
    expect(destinationAfterSignIn(account({ status: 'PENDING_VERIFICATION' }))).toBe(
      '/verify-email?email=juan.delacruz%40university.edu',
    );
  });

  it('has no destination for a disabled account', () => {
    expect(destinationAfterSignIn(account({ status: 'DISABLED' }))).toBeNull();
  });
});

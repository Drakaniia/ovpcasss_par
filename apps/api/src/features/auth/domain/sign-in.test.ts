import { describe, expect, it } from 'vitest';

import { signInGate } from './sign-in';

describe('signInGate', () => {
  it('lets an active account sign in', () => {
    expect(signInGate('ACTIVE')).toEqual({ allowed: true });
  });

  it('lets a pending-role account sign in to reach the awaiting-approval screen', () => {
    expect(signInGate('PENDING_ROLE')).toEqual({ allowed: true });
  });

  it('blocks an unverified account', () => {
    expect(signInGate('PENDING_VERIFICATION')).toEqual({
      allowed: false,
      reason: 'EMAIL_NOT_VERIFIED',
    });
  });

  it('blocks a disabled account', () => {
    expect(signInGate('DISABLED')).toEqual({ allowed: false, reason: 'ACCOUNT_DISABLED' });
  });
});

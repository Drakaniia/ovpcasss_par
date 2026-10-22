import type { Account } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { startupDestination } from './startup-route';

const account = (overrides: Partial<Account>): Account => ({
  id: 'user-1',
  email: 'juan.delacruz@university.edu',
  fullName: 'Juan Dela Cruz',
  role: null,
  status: 'ACTIVE',
  ...overrides,
});

describe('startupDestination', () => {
  it('sends a signed-out launch to sign-in', () => {
    expect(startupDestination('/', null)).toBe('/login');
  });

  it('leaves a signed-out launch on an auth page', () => {
    expect(startupDestination('/login', null)).toBeNull();
    expect(startupDestination('/verify-email', null)).toBeNull();
  });

  it('keeps an active account where it landed', () => {
    expect(startupDestination('/', account({ status: 'ACTIVE' }))).toBeNull();
    expect(startupDestination('/reports', account({ status: 'ACTIVE' }))).toBeNull();
  });

  it('moves an active account off the sign-in pages', () => {
    expect(startupDestination('/login', account({ status: 'ACTIVE' }))).toBe('/');
    expect(startupDestination('/register', account({ status: 'ACTIVE' }))).toBe('/');
  });

  it('sends an unverified account to the verify screen with the address', () => {
    expect(startupDestination('/', account({ status: 'PENDING_VERIFICATION' }))).toBe(
      '/verify-email?email=juan.delacruz%40university.edu',
    );
    expect(
      startupDestination('/verify-email', account({ status: 'PENDING_VERIFICATION' })),
    ).toBeNull();
  });

  it('has no destination for a disabled account', () => {
    expect(startupDestination('/', account({ status: 'DISABLED' }))).toBeNull();
  });
});

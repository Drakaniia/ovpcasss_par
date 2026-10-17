import type { Account } from '@par/shared';

/**
 * Status-driven entry routing (UI spec §7.1). The API's account status is the
 * only source; the UI never guesses a destination. Returns null for `DISABLED`,
 * which sign-in reports as an unavailable account rather than a destination.
 */
export function destinationAfterSignIn(account: Pick<Account, 'status' | 'email'>): string | null {
  switch (account.status) {
    case 'ACTIVE':
      return '/';
    case 'PENDING_ROLE':
      return '/awaiting-approval';
    case 'PENDING_VERIFICATION':
      return `/verify-email?email=${encodeURIComponent(account.email)}`;
    case 'DISABLED':
      return null;
  }
}

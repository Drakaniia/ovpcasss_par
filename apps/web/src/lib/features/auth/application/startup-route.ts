import type { Account } from '@par/shared';

/**
 * Pages shown without the app chrome; a signed-out launch may stay on them.
 * The root layout also uses this set to decide when the chrome renders.
 */
export const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

type LaunchAccount = Pick<Account, 'status' | 'email'>;

/**
 * Where the desktop shell must land before the splash is released, or null to
 * stay put (startup spec §7.5). The gate owns this one navigation so the splash
 * never hides a page the user is about to be sent away from; pages keep their
 * own post-load redirects, which then see the correct URL.
 */
export function startupDestination(pathname: string, account: LaunchAccount | null): string | null {
  if (!account) {
    return AUTH_PATHS.has(pathname) ? null : '/login';
  }

  switch (account.status) {
    case 'PENDING_VERIFICATION':
      return pathname === '/verify-email'
        ? null
        : `/verify-email?email=${encodeURIComponent(account.email)}`;
    case 'ACTIVE':
      return pathname === '/login' || pathname === '/register' ? '/' : null;
    case 'DISABLED':
      return null;
  }
}

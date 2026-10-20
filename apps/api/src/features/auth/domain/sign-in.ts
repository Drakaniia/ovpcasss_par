import type { UserStatus } from '@par/shared';

/** Why a correct password still cannot open a session (spec §7.4). */
export type SignInBlock = 'EMAIL_NOT_VERIFIED' | 'ACCOUNT_DISABLED';

export type SignInDecision = { allowed: true } | { allowed: false; reason: SignInBlock };

/**
 * The sign-in gate (spec §7.4). Credentials are verified before this runs, so a
 * blocked status is only reached by someone who already proved the password.
 * `PENDING_ROLE` may sign in — the client routes it to the awaiting-approval
 * screen — while an unverified or disabled account may not.
 */
export function signInGate(status: UserStatus): SignInDecision {
  switch (status) {
    case 'ACTIVE':
    case 'PENDING_ROLE':
      return { allowed: true };
    case 'PENDING_VERIFICATION':
      return { allowed: false, reason: 'EMAIL_NOT_VERIFIED' };
    case 'DISABLED':
      return { allowed: false, reason: 'ACCOUNT_DISABLED' };
  }
}

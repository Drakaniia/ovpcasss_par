import type { Role, UserStatus } from '@par/shared';

/**
 * Assigning a role to an account that is still waiting for one activates it
 * (UI spec phase 03 §3); every other status is left as it is.
 */
export function statusAfterRoleAssignment(current: UserStatus): UserStatus {
  return current === 'PENDING_ROLE' ? 'ACTIVE' : current;
}

/** The role enum in the office's title case, as the inbox names it ("Reviewer"). */
export function roleLabel(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

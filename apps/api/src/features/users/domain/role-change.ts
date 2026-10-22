import type { Role } from '@par/shared';

/** The role enum in the office's title case, as the inbox names it ("Reviewer"). */
export function roleLabel(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

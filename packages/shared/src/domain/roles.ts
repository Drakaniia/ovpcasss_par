import type { Role } from './enums';

/**
 * ADMIN stands in for the office and may make every decision; PERSONNEL may
 * only act on the records it is assigned to (spec §4). Membership, not this
 * predicate, decides access to a report.
 */
export function actsAs(role: Role | null | undefined, expected: Role): boolean {
  return role === expected || role === 'ADMIN';
}

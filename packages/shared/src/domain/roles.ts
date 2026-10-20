import type { Role } from './enums';

/**
 * Admin stands in for every role (owner decision, 2026-10-20): it may submit,
 * review, endorse, and approve. Separation of duties still holds per person —
 * nobody decides on a report they submitted (spec §9).
 */
export function actsAs(role: Role | null | undefined, expected: Role): boolean {
  return role === expected || role === 'ADMIN';
}

import type { UserRow } from '@par/db';

/**
 * Onboarding step 1 "Complete your profile" (derived spec, phase 02 §5): name,
 * campus/unit, and contact number are all present. The name is required at
 * registration, so in practice the optional fields are what gate completion.
 */
export function isProfileComplete(
  user: Pick<UserRow, 'fullName' | 'campusUnit' | 'contactNumber'>,
): boolean {
  return hasText(user.fullName) && hasText(user.campusUnit) && hasText(user.contactNumber);
}

function hasText(value: string | null): boolean {
  return value !== null && value.trim() !== '';
}

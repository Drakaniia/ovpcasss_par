import { PASSWORD_MIN_LENGTH } from '@par/shared';

/**
 * Text-only strength feedback (UI spec §7.2): the label carries the meaning, so
 * it stays unambiguous without color. Returns null while the field is empty.
 */
export function passwordStrengthText(password: string): string | null {
  if (!password) return null;

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Too short — ${password.length} of ${PASSWORD_MIN_LENGTH} characters.`;
  }

  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const digit = /\d/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);

  if (lower && upper && digit && symbol) {
    return 'Strong — mixed case, with a number and a symbol.';
  }
  if (lower && upper && digit) {
    return 'Strong — at least 12 characters, mixed case, and a number.';
  }
  if (lower && upper) {
    return 'Fair — mixed case; add a number.';
  }
  if (digit) {
    return 'Fair — add uppercase and lowercase letters.';
  }
  return 'Weak — add mixed case and a number.';
}

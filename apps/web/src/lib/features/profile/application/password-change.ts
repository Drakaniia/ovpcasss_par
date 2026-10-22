import { ApiError } from '$lib/api/http';

/** The API's code for a current password that does not match the account. */
const CURRENT_MISMATCH = 'PASSWORD_CURRENT_MISMATCH';

export type PasswordChangeFailure =
  { kind: 'field'; field: 'currentPassword'; message: string } | { kind: 'alert'; message: string };

/**
 * Maps a failed password change to what the card shows (UI spec §7.14). The API
 * names the failing field with its own code, so the card never guesses: a code
 * it does not know becomes the retryable alert.
 */
export function passwordChangeFailure(error: unknown): PasswordChangeFailure {
  if (error instanceof ApiError && error.code === CURRENT_MISMATCH) {
    return { kind: 'field', field: 'currentPassword', message: error.message };
  }

  return {
    kind: 'alert',
    message:
      error instanceof ApiError
        ? 'We could not update your password. Try again.'
        : 'We could not reach the server. Check your connection and try again.',
  };
}

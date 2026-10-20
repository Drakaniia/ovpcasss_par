const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: 'Google sign-in is not configured. Use your email and password.',
  google_cancelled: 'Google sign-in was cancelled. Try again.',
  google_state: 'Google sign-in expired. Try again.',
  google_domain: 'Use your university email address to sign in with Google.',
  google_disabled: 'This account is disabled. Contact the OVPCASSS administrator.',
  google_failed: 'We could not sign you in with Google. Try again.',
};

/** Maps the server's failure code, or the shell's own message, to display copy. */
export function googleErrorMessage(code: string): string {
  return GOOGLE_ERRORS[code] ?? 'We could not sign you in with Google. Try again.';
}

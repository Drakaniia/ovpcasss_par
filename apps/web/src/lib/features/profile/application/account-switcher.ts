/**
 * The account switcher's decisions, kept out of the component so the browser
 * and desktop paths can be checked without a DOM (report 5). A browser session
 * is one HttpOnly cookie: switching there signs out and prefills the address.
 * The desktop shell holds one token per saved account and swaps it directly.
 */

export type SwitchOutcome = 'switched' | 'sign-in' | 'failed';
export type SwitchStep = 'restore' | 'sign-in' | 'expired';

export function switchStep(shell: 'web' | 'desktop', outcome: SwitchOutcome): SwitchStep {
  if (shell === 'web') return 'sign-in';
  return outcome === 'switched' ? 'restore' : 'expired';
}

/** The sign-in address carries the chosen account so the field is ready. */
export function loginHref(email: string): string {
  const clean = email.trim();
  return clean ? `/login?email=${encodeURIComponent(clean)}` : '/login';
}

/** Reads the prefill from a route's `?email=`, bounded like the form's field. */
export function prefillEmail(search: string): string {
  const value = new URLSearchParams(search).get('email')?.trim() ?? '';
  return value.slice(0, 254);
}

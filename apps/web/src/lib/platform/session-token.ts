import { setSessionToken } from '$lib/api/http';

import { platform } from './index';

/**
 * The desktop bearer token (spec §7.4). The OS credential store owns the copy
 * that survives a restart; the HTTP client only ever holds it in memory. The
 * web build returns an inert store, so every helper here is a no-op there.
 */
let restored: Promise<void> | null = null;

/** Runs once per page load, before the first authenticated request. */
export function restoreSessionToken(): Promise<void> {
  restored ??= (async () => {
    try {
      const current = await platform();
      if (current.shell !== 'desktop') return;

      const token = await current.tokens.read();
      if (token) setSessionToken(token);
    } catch {
      // A credential-store failure leaves the shell signed out; sign-in retries.
    }
  })();

  return restored;
}

export async function rememberSessionToken(token: string): Promise<void> {
  setSessionToken(token);

  try {
    const current = await platform();
    if (current.shell === 'desktop') await current.tokens.write(token);
  } catch {
    // The in-memory token still covers this launch; the next launch signs in again.
  }
}

export async function forgetSessionToken(): Promise<void> {
  setSessionToken(null);

  try {
    const current = await platform();
    if (current.shell === 'desktop') await current.tokens.clear();
  } catch {
    // Clearing the in-memory token already ended the session for this launch.
  }
}

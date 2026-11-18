import { ApiError, setSessionToken } from '$lib/api/http';

import type { SavedAccount, SavedAccountIdentity } from './contracts';
import { platform } from './index';

/**
 * The desktop bearer token (spec §7.4). The OS credential store owns the copy
 * that survives a restart; the HTTP client only ever holds it in memory. The
 * browser keeps no token at all, only the names and emails that make a switch
 * convenient (report 5), so every helper here exists in both shells.
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

/** Records a new session: the token on desktop, the account in both shells. */
export async function rememberSessionToken(
  token: string,
  account?: SavedAccountIdentity,
): Promise<void> {
  setSessionToken(token);

  try {
    const current = await platform();
    await current.tokens.write(token, account);
  } catch {
    // The in-memory token still covers this launch; the next launch signs in again.
  }
}

/** Remembers who signed in even when the API returned no token (the browser). */
export async function rememberAccount(account: SavedAccountIdentity): Promise<void> {
  try {
    const current = await platform();
    await current.tokens.remember(account);
  } catch {
    // The sign-in still stands; only the convenience list misses this account.
  }
}

/**
 * The saved accounts, or a rejection the card reports. Swallowing the failure
 * into an empty list told a user with a broken credential store that no account
 * was ever saved, which is exactly the wrong thing to say (report 5).
 */
export function savedAccounts(): Promise<SavedAccount[]> {
  return platform().then((current) => current.tokens.list());
}

/**
 * Switches to a saved account. `switched` means the cookie or desktop token
 * changed; `sign-in` means a saved browser session expired. Network failures
 * propagate so they cannot be mistaken for expired credentials.
 */
export async function switchToAccount(id: string): Promise<'switched' | 'sign-in' | 'failed'> {
  try {
    const current = await platform();
    const token = await current.tokens.switchTo(id);

    if (token === true) return 'switched';
    if (typeof token === 'string') {
      setSessionToken(token);
      return 'switched';
    }

    return current.shell === 'web' ? 'sign-in' : 'failed';
  } catch (error) {
    if (error instanceof ApiError && error.code === 'SESSION_EXPIRED') return 'sign-in';
    throw error;
  }
}

export async function forgetAccount(id: string): Promise<void> {
  const current = await platform();
  await current.tokens.forget(id);
}

export async function forgetSessionToken(): Promise<void> {
  setSessionToken(null);

  try {
    const current = await platform();
    await current.tokens.clear();
  } catch {
    // Clearing the in-memory token already ended the session for this launch.
  }
}

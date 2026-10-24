import type { SavedAccount, SavedAccountIdentity, SecureTokenStore } from '../contracts';

/**
 * Web sessions live in an HttpOnly cookie, so the app never holds a token
 * (spec §7.4). The saved-account list therefore keeps only the name and email
 * that make a switch convenient: choosing one signs out and prefills the sign-in
 * form, never silently re-authenticates.
 */
const STORAGE_KEY = 'par-saved-accounts';

type Entry = SavedAccountIdentity & { active?: boolean };
type Stored = { version: 1; active: string | null; accounts: Entry[] };

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, active: null, accounts: [] };

    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      version: 1,
      active: typeof parsed.active === 'string' ? parsed.active : null,
      accounts: Array.isArray(parsed.accounts)
        ? parsed.accounts.filter(
            (entry): entry is Entry =>
              typeof entry === 'object' &&
              entry !== null &&
              typeof (entry as Entry).id === 'string' &&
              typeof (entry as Entry).email === 'string',
          )
        : [],
    };
  } catch {
    return { version: 1, active: null, accounts: [] };
  }
}

function write(store: Stored): void {
  try {
    if (store.accounts.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // A full or unavailable store only costs the convenience list.
  }
}

function upsert(store: Stored, account: SavedAccountIdentity): Stored {
  const accounts = store.accounts.some((entry) => entry.id === account.id)
    ? store.accounts.map((entry) => (entry.id === account.id ? { ...entry, ...account } : entry))
    : [...store.accounts, account];

  return { version: 1, active: account.id, accounts };
}

export function createTokenStore(): SecureTokenStore {
  return {
    async read() {
      return null;
    },

    async write(_token, account) {
      if (account) write(upsert(read(), account));
    },

    async clear() {
      write({ ...read(), active: null });
    },

    async list(): Promise<SavedAccount[]> {
      const store = read();
      return store.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        email: account.email,
        active: account.id === store.active,
      }));
    },

    async switchTo() {
      // No token exists in the browser; the card signs out and prefills instead.
      return null;
    },

    async forget(id) {
      const store = read();
      write({
        version: 1,
        active: store.active === id ? null : store.active,
        accounts: store.accounts.filter((account) => account.id !== id),
      });
    },

    async remember(account) {
      write(upsert(read(), account));
    },
  };
}

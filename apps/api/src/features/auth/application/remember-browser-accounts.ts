import { createDb, createUserQueries, type UserRow } from '@par/db';
import { preferencesSchema, rememberedAccountsSchema, type Preferences } from '@par/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';

function preferences(raw: string | null): Preferences {
  try {
    return preferencesSchema.parse(JSON.parse(raw ?? '{}'));
  } catch {
    return {};
  }
}

/**
 * Only a successful browser sign-in links the previous identity to the new
 * account. Names live in the new account's preferences, never browser storage;
 * they grant no access and switching still requires a fresh sign-in.
 */
export async function rememberBrowserAccounts(
  c: Context<AppEnv>,
  user: UserRow,
  at: string,
): Promise<void> {
  const users = createUserQueries(createDb(c.env.DB));
  const previousId = c.get('userId');
  const previous = previousId && previousId !== user.id ? await users.findById(previousId) : null;
  const current = preferences(user.preferences);
  const identity = (row: UserRow) => ({ id: row.id, name: row.fullName, email: row.email });
  const candidates = [
    identity(user),
    ...(previous ? [identity(previous)] : []),
    ...(current.rememberedAccounts ?? []),
    ...(previous ? (preferences(previous.preferences).rememberedAccounts ?? []) : []),
  ];
  const seen = new Set<string>();
  const rememberedAccounts = rememberedAccountsSchema.parse(
    candidates
      .filter((account) => {
        if (seen.has(account.id)) return false;
        seen.add(account.id);
        return true;
      })
      .slice(0, 20),
  );

  await users.update(
    user.id,
    {
      preferences: JSON.stringify({ ...current, rememberedAccounts }),
    },
    at,
  );
}

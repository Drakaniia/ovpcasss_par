import { api } from '$lib/api/client';

import type { SecureTokenStore } from '../contracts';

/**
 * Web sessions live in an HttpOnly cookie, so the app never holds a token and
 * reads remembered identities from `/me/preferences`, not browser storage
 * (settings spec §7.14). Switching accounts still requires a fresh sign-in.
 */
export function createTokenStore(): SecureTokenStore {
  return {
    async read() {
      return null;
    },

    async write() {
      // Nothing to keep: the cookie is the session.
    },

    async clear() {
      // The cookie is cleared by the API's sign-out.
    },

    async list() {
      const [{ preferences }, account] = await Promise.all([
        api.preferences.get(),
        api.profile.get(),
      ]);
      return (preferences.rememberedAccounts ?? []).map((identity) => ({
        ...identity,
        active: identity.id === account.id,
      }));
    },

    async switchTo() {
      return null;
    },

    async forget(id) {
      const { preferences } = await api.preferences.get();
      await api.preferences.save({
        rememberedAccounts: (preferences.rememberedAccounts ?? []).filter(
          (account) => account.id !== id,
        ),
      });
    },

    async remember() {
      // The API records identities when it issues the successful sign-in cookie.
    },
  };
}

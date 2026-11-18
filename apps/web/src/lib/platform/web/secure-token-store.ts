import { api } from '$lib/api/client';

import type { SecureTokenStore } from '../contracts';

/**
 * Web sessions live in an HttpOnly cookie, so the app never holds a token and
 * uses the API to switch saved HttpOnly sessions without exposing credentials.
 * Names from preferences never grant access to an account.
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
      return (await api.auth.accounts()).accounts;
    },

    async switchTo(id) {
      await api.auth.switchAccount(id);
      return true;
    },

    async forget(id) {
      await api.auth.forgetAccount(id);
    },

    async remember() {
      // The API records identities when it issues the successful sign-in cookie.
    },
  };
}

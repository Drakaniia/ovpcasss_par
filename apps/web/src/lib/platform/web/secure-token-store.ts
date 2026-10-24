import type { SecureTokenStore } from '../contracts';

/**
 * Web sessions live in an HttpOnly cookie, so the app never holds a token and
 * keeps no account list: browser storage is not used at all (settings spec
 * §7.14). Switching accounts is a sign-in, not a switch, and the account's own
 * settings are read from `/me/preferences` instead of the device.
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
      return [];
    },

    async switchTo() {
      return null;
    },

    async forget() {
      // There is no list to forget from.
    },

    async remember() {
      // Nothing is written to the device.
    },
  };
}

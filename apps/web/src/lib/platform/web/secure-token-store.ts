import type { SecureTokenStore } from '../contracts';

/** Web sessions live in an HttpOnly cookie, so the app never holds a token (spec §7.4). */
export function createTokenStore(): SecureTokenStore {
  return {
    async read() {
      return null;
    },
    async write() {
      return;
    },
    async clear() {
      return;
    },
  };
}

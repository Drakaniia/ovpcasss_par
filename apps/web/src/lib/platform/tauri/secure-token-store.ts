import type { SecureTokenStore } from '../contracts';

/**
 * Keeps the desktop bearer token in the OS credential store, never in webview
 * storage (spec §6). Implemented in M7.
 */
export function createTokenStore(): SecureTokenStore {
  throw new Error('Secure token store is not implemented yet (M7)');
}

import { invoke } from '@tauri-apps/api/core';

import type { AuthFlow } from '../contracts';

/**
 * The system browser runs the OAuth flow (Google blocks embedded webviews), and
 * the shell listens on 127.0.0.1 for the session token (spec A7.4, RFC 8252).
 */
export function createAuthFlow(): AuthFlow {
  return {
    signInWithGoogle: (startUrl) =>
      invoke<string>('google_sign_in', { startUrl, nonce: crypto.randomUUID() }),
    cancelSignIn: () => invoke<void>('google_cancel'),
  };
}

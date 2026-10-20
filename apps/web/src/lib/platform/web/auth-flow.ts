import type { AuthFlow } from '../contracts';

/** The browser follows the OAuth redirect itself; the desktop shell uses the loopback. */
export function createAuthFlow(): AuthFlow {
  return {
    async signInWithGoogle(startUrl) {
      window.location.assign(startUrl);
      return null;
    },
    async cancelSignIn() {
      // The browser owns the pending navigation; there is nothing to stop.
    },
  };
}

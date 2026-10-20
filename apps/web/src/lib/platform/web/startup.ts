import type { StartupGate } from '../contracts';

/** The browser build has no splash window; the gate is a no-op. */
export function createStartupGate(): StartupGate {
  return {
    async ready() {
      // Nothing to release.
    },
  };
}

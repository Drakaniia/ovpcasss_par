import type { Downloads } from '../contracts';

/**
 * Browsers do not expose the downloads folder, so the toast action that opens
 * it is only offered by the desktop shell (phase 14 §4).
 */
export function createDownloads(): Downloads {
  return {
    async reveal() {
      // No browser API exists; the caller hides the affordance on the web.
    },
  };
}

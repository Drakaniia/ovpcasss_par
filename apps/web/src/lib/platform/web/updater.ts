import type { Updater } from '../contracts';

/** The browser build is served fresh; there is nothing to install locally. */
export function createUpdater(): Updater {
  return {
    supported: false,
    currentVersion: async () => '0.0.0',
    check: async () => null,
  };
}

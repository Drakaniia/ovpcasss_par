import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';

import type { Updater } from '../contracts';

/** Signed updates from the latest GitHub release (`tauri.conf.json`). */
export function createUpdater(): Updater {
  return {
    supported: true,
    currentVersion: () => getVersion(),

    async check() {
      const update = await check();
      if (!update) return null;

      return {
        version: update.version,

        async download(onProgress) {
          let received = 0;
          let total = 0;

          await update.download((event) => {
            if (event.event === 'Started') {
              total = event.data.contentLength ?? 0;
            } else if (event.event === 'Progress') {
              received += event.data.chunkLength;
              if (total > 0) {
                onProgress(Math.min(100, Math.round((received / total) * 100)));
              }
            } else {
              onProgress(100);
            }
          });
        },

        install: () => update.install(),
      };
    },
  };
}

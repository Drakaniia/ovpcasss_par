import { invoke } from '@tauri-apps/api/core';

import type { Downloads } from '../contracts';

/** Opens the Downloads folder the webview saved the export into (phase 15). */
export function createDownloads(): Downloads {
  return {
    reveal: () => invoke<void>('reveal_downloads'),
  };
}

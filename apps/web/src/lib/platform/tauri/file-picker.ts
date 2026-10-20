import { invoke } from '@tauri-apps/api/core';

import type { FilePicker, PickedFile } from '../contracts';

/**
 * The native file dialog (phase 15 §2). Rust returns each file's path, size,
 * and type, so the uploader can validate at pick time and stream the bytes
 * from disk instead of asking the webview to hold them.
 */
export function createFilePicker(): FilePicker {
  return {
    pick: () => invoke<PickedFile[]>('pick_attachments'),
  };
}

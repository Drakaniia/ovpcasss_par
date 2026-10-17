import type { FilePicker } from '../contracts';

/**
 * Uses the Tauri dialog plugin so desktop uploads can stream from disk instead
 * of through the webview (spec §6). Implemented in M7.
 */
export function createFilePicker(): FilePicker {
  throw new Error('Tauri file picker is not implemented yet (M7)');
}

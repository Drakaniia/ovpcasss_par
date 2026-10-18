import type { DraftStore } from '../contracts';

/**
 * Local drafts on SQLite (`sqlite:par-drafts.db`) via the Tauri SQL plugin
 * (spec §6), so a draft survives an app restart. Implemented in M7.
 */
export function createDraftStore(): DraftStore {
  throw new Error('Tauri draft store is not implemented yet (M7)');
}

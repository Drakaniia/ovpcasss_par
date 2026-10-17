import type { DraftStore } from '../contracts';

/**
 * Offline drafts on local SQLite (`sqlite:par-drafts.db`) via the Tauri SQL
 * plugin, plus the queued attachment paths of the outbox (spec §6).
 * Implemented in M7.
 */
export function createDraftStore(): DraftStore {
  throw new Error('Tauri draft store is not implemented yet (M7)');
}

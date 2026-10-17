import type { ReportDraft } from '@par/shared';

import type { DraftStore } from '../contracts';

/** Web fallback: drafts survive navigation but not a reload. IndexedDB lands in M7. */
export function createDraftStore(): DraftStore {
  const drafts = new Map<string, ReportDraft>();

  return {
    async list() {
      return [...drafts.values()];
    },
    async get(id) {
      return drafts.get(id) ?? null;
    },
    async put(draft) {
      drafts.set(draft.id, draft);
    },
    async remove(id) {
      drafts.delete(id);
    },
  };
}

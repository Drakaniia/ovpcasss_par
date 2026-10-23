import { api } from '$lib/api/client';
import { session } from '$lib/session/session.svelte';

/**
 * The one source for section-tab dots (bug phase 08 §3.7): the existing inbox
 * response, never a second endpoint. Refreshes are throttled to one request a
 * minute in the background; a failed refresh keeps the last known counts.
 */
export type InboxAttention = {
  awaitingReview: number;
  returned: number;
  failedEmails: number;
  loadedAt: number;
  /** The account these counts belong to; another account never inherits them. */
  userId: string | null;
};

const THROTTLE_MS = 60_000;

export const inboxAttention = $state<InboxAttention>({
  awaitingReview: 0,
  returned: 0,
  failedEmails: 0,
  loadedAt: 0,
  userId: null,
});

let inflight: Promise<void> | null = null;

export function clearInboxAttention(): void {
  inboxAttention.awaitingReview = 0;
  inboxAttention.returned = 0;
  inboxAttention.failedEmails = 0;
  inboxAttention.loadedAt = 0;
  inboxAttention.userId = null;
  inflight = null;
}

/** Called by a submit or a decision; the next refresh ignores the throttle. */
export function invalidateInboxAttention(): void {
  inboxAttention.loadedAt = 0;

  // A request already in flight may predate the mutation; read again after it.
  if (inflight) void inflight.finally(() => refreshInboxAttention(true));
  else void refreshInboxAttention(true);
}

export async function refreshInboxAttention(force = false): Promise<void> {
  if (!session.user) {
    clearInboxAttention();
    return;
  }

  // A different account starts from zero, never from the previous dots.
  if (inboxAttention.userId !== session.user.id) {
    clearInboxAttention();
    inboxAttention.userId = session.user.id;
  }

  if (!force && Date.now() - inboxAttention.loadedAt < THROTTLE_MS) return;
  if (inflight) return inflight;

  inflight = api.inbox
    .get()
    .then((inbox) => {
      inboxAttention.awaitingReview = inbox.awaitingReview.total;
      inboxAttention.returned = inbox.returned.total;
      inboxAttention.failedEmails = inbox.admin?.failedEmails ?? 0;
      inboxAttention.loadedAt = Date.now();
    })
    .catch(() => {
      // Keep the last known values; the chrome never shows an error (phase 08 §3.7).
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

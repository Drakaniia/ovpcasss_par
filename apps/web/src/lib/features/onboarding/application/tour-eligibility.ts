/**
 * When the tour may open (onboarding spec §8.2). Pure predicates so the one
 * surprising rule — a replay from Help is allowed after completion, an automatic
 * start is not — can be tested without a router, a store or a browser.
 */
import type { UserStatus } from '@par/shared';

export type HomeInboxStatus = 'idle' | 'ready' | 'failed';

export type TourEligibilityInput = {
  status: 'idle' | 'active';
  pathname: string;
  accountStatus: UserStatus | null;
  homeStatus: HomeInboxStatus;
  viewportWidth: number;
  completed: boolean;
  /** An automatic start has already been attempted in this document. */
  startedThisSession: boolean;
  pendingManualStart: boolean;
  modalOpen: boolean;
};

/** The product is desktop-only; the foundation notice owns anything narrower. */
export const TOUR_MIN_WIDTH = 1024;

export const TOUR_DIALOG_SELECTOR = 'dialog[open][data-onboarding-tour]';

/** Every condition must hold: this runs on the first Home visit, once. */
export function shouldAutoStart(input: TourEligibilityInput): boolean {
  return (
    input.status === 'idle' &&
    !input.startedThisSession &&
    !input.pendingManualStart &&
    !input.completed &&
    input.pathname === '/' &&
    input.accountStatus === 'ACTIVE' &&
    input.homeStatus === 'ready' &&
    input.viewportWidth >= TOUR_MIN_WIDTH &&
    !input.modalOpen
  );
}

/**
 * Help may replay the tour in the same document, so completion, inbox readiness
 * and the session attempt are not required — only a usable window and an active
 * account.
 */
export function canStartManually(input: TourEligibilityInput): boolean {
  return (
    input.status === 'idle' &&
    input.accountStatus === 'ACTIVE' &&
    input.viewportWidth >= TOUR_MIN_WIDTH &&
    !input.modalOpen
  );
}

/** The single-key shortcut guard; takes the query so it needs no document. */
export function hasOpenTourOverlay(query: (selector: string) => Element | null): boolean {
  return query(TOUR_DIALOG_SELECTOR) !== null;
}

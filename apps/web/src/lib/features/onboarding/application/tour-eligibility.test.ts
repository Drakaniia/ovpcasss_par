import { describe, expect, it } from 'vitest';

import {
  hasOpenTourOverlay,
  canStartManually,
  shouldAutoStart,
  TOUR_MIN_WIDTH,
  type TourEligibilityInput,
} from './tour-eligibility';

function input(overrides: Partial<TourEligibilityInput> = {}): TourEligibilityInput {
  return {
    status: 'idle',
    pathname: '/',
    accountStatus: 'ACTIVE',
    homeStatus: 'ready',
    viewportWidth: 1280,
    completed: false,
    startedThisSession: false,
    pendingManualStart: false,
    modalOpen: false,
    ...overrides,
  };
}

describe('shouldAutoStart', () => {
  it('opens on the first eligible Home visit', () => {
    expect(shouldAutoStart(input())).toBe(true);
  });

  it('refuses every other combination', () => {
    for (const overrides of [
      { pathname: '/reports' },
      { accountStatus: 'PENDING_VERIFICATION' },
      { accountStatus: 'PENDING_ROLE' },
      { accountStatus: null },
      { homeStatus: 'idle' },
      { homeStatus: 'failed' },
      { viewportWidth: TOUR_MIN_WIDTH - 1 },
      { completed: true },
      { startedThisSession: true },
      { modalOpen: true },
      { pendingManualStart: true },
      { status: 'active' },
    ] satisfies Partial<TourEligibilityInput>[]) {
      expect(shouldAutoStart(input(overrides)), JSON.stringify(overrides)).toBe(false);
    }
  });

  it('accepts the minimum supported width', () => {
    expect(shouldAutoStart(input({ viewportWidth: TOUR_MIN_WIDTH }))).toBe(true);
  });
});

describe('canStartManually', () => {
  it('replays after completion and without waiting for the inbox', () => {
    expect(
      canStartManually(
        input({ completed: true, startedThisSession: true, homeStatus: 'idle', pathname: '/x' }),
      ),
    ).toBe(true);
  });

  it('still needs an active account and a desktop window', () => {
    expect(canStartManually(input({ accountStatus: 'PENDING_VERIFICATION' }))).toBe(false);
    expect(canStartManually(input({ viewportWidth: 1023 }))).toBe(false);
    expect(canStartManually(input({ modalOpen: true }))).toBe(false);
  });
});

describe('hasOpenTourOverlay', () => {
  it('asks the document for the tour dialog', () => {
    const seen: string[] = [];

    expect(
      hasOpenTourOverlay((selector) => {
        seen.push(selector);
        return {} as Element;
      }),
    ).toBe(true);
    expect(seen).toEqual(['dialog[open][data-onboarding-tour]']);

    expect(hasOpenTourOverlay(() => null)).toBe(false);
  });
});

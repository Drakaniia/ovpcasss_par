/**
 * The onboarding tour store (onboarding spec §8.2–§8.4). It owns the one piece
 * of state that outlives a step — whether this account has finished onboarding —
 * and the transitions between welcome, the spotlight sequence and the summary.
 *
 * Routing and viewport width are injected so the module never imports `$app`;
 * `hasTarget` is the only thing it reads from the DOM, and only at start.
 */
import { tick } from 'svelte';

import {
  clearTourRecord,
  savePreferences,
  tourRecord,
} from '$lib/features/preferences/application/preferences.svelte';
import { session } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

import {
  canStartManually,
  shouldAutoStart,
  TOUR_MIN_WIDTH,
  type HomeInboxStatus,
} from './tour-eligibility';
import { hasSpotlightStep, resolveTourSteps, type ResolvedStep } from './tour-steps';

/** Bumping this re-arms the tour once for everybody after a copy change. */
const TOUR_VERSION = 1;

type TourOutcome = 'completed' | 'skipped';

export type Navigate = () => void | Promise<void>;

export type StartOptions = {
  pathname: string;
  /** Injected by the caller so this module never imports `$app`. */
  navigate?: Navigate;
};

const INBOX_FAILURE_MESSAGE = 'The tour could not start because the work inbox did not load.';

/** Two frames let the inbox markup land; the watchdog keeps a hidden tab from hanging. */
const PAINT_WATCHDOG_MS = 250;

export const tour = $state<{
  status: 'idle' | 'active';
  steps: ResolvedStep[];
  index: number;
  startedAt: number | null;
}>({ status: 'idle', steps: [], index: 0, startedAt: null });

export const homeInbox = $state<{ status: HomeInboxStatus }>({ status: 'idle' });

/**
 * The completion mirror. Seeded lazily for whoever is signed in, and written on
 * every outcome so a blocked storage area still suppresses a second auto-start
 * in this document.
 */
const completion = $state<{ userId: string | null; value: boolean }>({
  userId: null,
  value: false,
});

let startedThisSession = false;
let pendingManualStart = false;
let starting = false;
let viewportWidth = 0;

export function setHomeInboxStatus(status: HomeInboxStatus): void {
  homeInbox.status = status;
}

export function setViewport(width: number): void {
  viewportWidth = width;
}

/** Reactive: a reset clears the mirror and re-arms the automatic gate. */
export function hasCompletedTour(): boolean {
  const id = session.user?.id ?? null;

  if (completion.userId !== id) {
    completion.userId = id;
    completion.value = id ? tourRecord() !== null : false;
  }

  return completion.value;
}

export function currentStep(): ResolvedStep | null {
  return tour.steps[tour.index] ?? null;
}

/**
 * Called from the mounted component's effect with its reactive inputs. The
 * effect re-runs on a route change, a resize, a session change and an inbox
 * status change, which is every input the gate needs.
 */
export function maybeAutoStart(input: { pathname: string; viewportWidth: number }): void {
  setViewport(input.viewportWidth);

  const base = {
    status: tour.status,
    pathname: input.pathname,
    accountStatus: session.user?.status ?? null,
    homeStatus: homeInbox.status,
    viewportWidth: input.viewportWidth,
    completed: hasCompletedTour(),
    startedThisSession,
    pendingManualStart,
    modalOpen: isModalOpen(),
  };

  if (pendingManualStart) {
    if (base.homeStatus === 'failed') {
      pendingManualStart = false;
      if (input.pathname === '/') toast.error(INBOX_FAILURE_MESSAGE);
      return;
    }

    if (input.pathname === '/' && base.homeStatus === 'ready' && canStartManually(base)) {
      void begin();
    }
    return;
  }

  if (shouldAutoStart(base)) void begin();
}

/** Help → Take the guided tour: arms a start, then goes Home when needed. */
export function startTour(options: StartOptions): void {
  if (tour.status === 'active' || isModalOpen()) return;
  if (viewportWidth < TOUR_MIN_WIDTH || session.user?.status !== 'ACTIVE') return;

  pendingManualStart = true;

  if (options.pathname === '/') {
    if (homeInbox.status === 'ready') void begin();
    else if (homeInbox.status === 'failed') {
      pendingManualStart = false;
      toast.error(INBOX_FAILURE_MESSAGE);
    }
    return;
  }

  void Promise.resolve(options.navigate?.());
}

/** Help → Reset onboarding: forget the record, report it, and start over. */
export function resetOnboarding(options: StartOptions): void {
  const id = session.user?.id;

  if (id) clearTourRecord();
  completion.userId = id ?? null;
  completion.value = false;
  startedThisSession = false;

  toast.success('Onboarding reset.');
  startTour(options);
}

export function nextStep(): void {
  if (tour.index >= tour.steps.length - 1) {
    finishTour();
    return;
  }

  tour.index += 1;
}

export function backStep(): void {
  if (tour.index > 0) tour.index -= 1;
}

/** Skip is an ending, not a pause: it never opens by itself again. */
export function skipTour(): void {
  recordOutcome('skipped');
  closeTour(false);
}

export function finishTour(): void {
  recordOutcome('completed');
  closeTour(false);
}

/** Closes without writing when the route or window no longer fits the tour. */
export function closeTour(markComplete: boolean): void {
  if (markComplete) recordOutcome('completed');

  pendingManualStart = false;
  tour.status = 'idle';
  tour.steps = [];
  tour.index = 0;
  tour.startedAt = null;
}

function recordOutcome(outcome: TourOutcome): void {
  const id = session.user?.id;

  if (id) {
    savePreferences({ tour: { version: TOUR_VERSION, outcome, at: new Date().toISOString() } });
  }
  completion.userId = id ?? null;
  completion.value = true;
}

async function begin(): Promise<void> {
  if (starting || tour.status === 'active' || isModalOpen()) return;
  if (typeof document === 'undefined') return;

  starting = true;

  try {
    await waitForPaint();

    const steps = resolveTourSteps(
      { role: session.user?.role ?? null },
      { hasTarget: anchorIsVisible },
    );

    if (!hasSpotlightStep(steps)) {
      // Nothing on this screen to point at: record it rather than open an
      // overlay that only says welcome and goodbye.
      recordOutcome('completed');
      pendingManualStart = false;
      return;
    }

    tour.steps = steps;
    tour.index = 0;
    tour.startedAt = Date.now();
    tour.status = 'active';
    startedThisSession = true;
    pendingManualStart = false;
  } finally {
    starting = false;
  }
}

async function waitForPaint(): Promise<void> {
  // `setHomeInboxStatus('ready')` runs before Svelte flushes the inbox markup.
  await tick();
  await Promise.race([nextFrames(2), delay(PAINT_WATCHDOG_MS)]);
}

function nextFrames(count: number): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve();

  return new Promise((resolve) => {
    let remaining = count;

    const step = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `offsetParent` is deliberately unused: fixed and sticky chrome can have none
 * while being perfectly visible.
 */
function anchorIsVisible(anchor: string): boolean {
  const element = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) return getComputedStyle(element).visibility !== 'hidden';

  return false;
}

function isModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('dialog[open]:not([data-onboarding-tour])') !== null;
}

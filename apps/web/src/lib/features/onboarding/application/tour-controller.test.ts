import type { Role } from '@par/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { session } from '$lib/session/session.svelte';

import {
  backStep,
  closeTour,
  hasCompletedTour,
  maybeAutoStart,
  nextStep,
  resetOnboarding,
  skipTour,
  startTour,
  tour,
} from './tour-controller.svelte';
import { tourKey, type StorageLike } from './tour-storage';
import type { ResolvedStep } from './tour-steps';

function fakeStorage() {
  const map = new Map<string, string>();
  const storage = {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  } satisfies StorageLike & { map: Map<string, string> };

  return storage;
}

function signIn(id: string, role: Role = 'SUBMITTER') {
  session.user = {
    id,
    fullName: 'Maria Santos',
    email: `${id}@example.test`,
    role,
    status: 'ACTIVE',
    campusUnit: null,
    contactNumber: null,
  };
}

function step(
  id: ResolvedStep['id'],
  position: number,
  total: number,
  final: boolean,
): ResolvedStep {
  return {
    id,
    anchor: null,
    placement: 'auto',
    title: id,
    description: id,
    position,
    total,
    final,
  };
}

function startWithSteps() {
  tour.status = 'active';
  tour.steps = [
    step('welcome', 1, 3, false),
    step('primary-nav', 2, 3, false),
    step('finish', 3, 3, true),
  ];
  tour.index = 0;
}

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal('localStorage', storage);
  closeTour(false);
  signIn(`account-${Math.random().toString(36).slice(2)}`);
  maybeAutoStart({ pathname: '/reports', viewportWidth: 1280 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  closeTour(false);
});

describe('step transitions', () => {
  it('moves forward and back without leaving the list', () => {
    startWithSteps();

    nextStep();
    expect(tour.index).toBe(1);

    backStep();
    backStep();
    expect(tour.index).toBe(0);
  });

  it('finishes from the last step and records completion', () => {
    startWithSteps();
    tour.index = 2;

    nextStep();

    expect(tour.status).toBe('idle');
    expect(tour.steps).toEqual([]);
    expect(JSON.parse(storage.map.get(tourKey(session.user!.id)) ?? '')).toMatchObject({
      outcome: 'completed',
    });
  });

  it('records a skip as an ending, not a pause', () => {
    startWithSteps();

    skipTour();

    expect(tour.status).toBe('idle');
    expect(hasCompletedTour()).toBe(true);
    expect(JSON.parse(storage.map.get(tourKey(session.user!.id)) ?? '')).toMatchObject({
      outcome: 'skipped',
    });
  });

  it('closes without writing when the surface no longer suits the tour', () => {
    startWithSteps();

    closeTour(false);

    expect(tour.status).toBe('idle');
    expect(hasCompletedTour()).toBe(false);
  });
});

describe('manual entry points', () => {
  it('arms a start and navigates home from another route', () => {
    const navigate = vi.fn(() => Promise.resolve());

    startTour({ pathname: '/reports', navigate });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(tour.status).toBe('idle');
  });

  it('does not navigate when already on Home', () => {
    const navigate = vi.fn(() => Promise.resolve());

    startTour({ pathname: '/', navigate });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears the record and reports a reset', () => {
    skipTour();
    expect(hasCompletedTour()).toBe(true);

    const navigate = vi.fn(() => Promise.resolve());
    resetOnboarding({ pathname: '/reports', navigate });

    expect(storage.map.has(tourKey(session.user!.id))).toBe(false);
    expect(hasCompletedTour()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('still suppresses the automatic tour when storage refuses writes', () => {
    const refusing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', refusing);
    signIn('blocked-account');
    maybeAutoStart({ pathname: '/reports', viewportWidth: 1280 });

    expect(hasCompletedTour()).toBe(false);

    skipTour();

    expect(hasCompletedTour()).toBe(true);
  });
});

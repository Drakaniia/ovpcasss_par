import type { Role } from '@par/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '$lib/api/client';
import {
  preferencesState,
  resetPreferences,
} from '$lib/features/preferences/application/preferences.svelte';
import { session } from '$lib/session/session.svelte';

import {
  backStep,
  closeTour,
  hasCompletedTour,
  maybeAutoStart,
  nextStep,
  resetOnboarding,
  setHomeInboxStatus,
  skipTour,
  startTour,
  tour,
} from './tour-controller.svelte';
import type { ResolvedStep } from './tour-steps';

function signIn(id: string, role: Role = 'PERSONNEL') {
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

beforeEach(() => {
  resetPreferences();
  preferencesState.loaded = true;
  setHomeInboxStatus('idle');
  vi.spyOn(api.preferences, 'save').mockResolvedValue({ preferences: {} });
  closeTour(false);
  signIn(`account-${Math.random().toString(36).slice(2)}`);
  maybeAutoStart({ pathname: '/reports', viewportWidth: 1280 });
});

afterEach(() => {
  vi.restoreAllMocks();
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
    expect(preferencesState.value.tour).toMatchObject({ outcome: 'completed' });
  });

  it('records a skip as an ending, not a pause', () => {
    startWithSteps();

    skipTour();

    expect(tour.status).toBe('idle');
    expect(hasCompletedTour()).toBe(true);
    expect(preferencesState.value.tour).toMatchObject({ outcome: 'skipped' });
  });

  it('closes without writing when the surface no longer suits the tour', () => {
    startWithSteps();

    closeTour(false);

    expect(tour.status).toBe('idle');
    expect(hasCompletedTour()).toBe(false);
  });
});

describe('preferences load', () => {
  it('sees a record that arrives after the first eligibility check', () => {
    signIn('late-preferences');
    expect(hasCompletedTour()).toBe(false);

    preferencesState.value = {
      tour: { version: 1, outcome: 'completed', at: new Date().toISOString() },
    };

    expect(hasCompletedTour()).toBe(true);
  });

  it('does not auto-start before the account record is read', () => {
    setHomeInboxStatus('ready');
    signIn('unread-record');
    preferencesState.value = {};
    preferencesState.loaded = false;

    maybeAutoStart({ pathname: '/', viewportWidth: 1280 });

    expect(tour.status).toBe('idle');
  });

  it('does not auto-start when the record could not be read', () => {
    setHomeInboxStatus('ready');
    signIn('failed-read');
    preferencesState.value = {};
    preferencesState.loaded = true;
    preferencesState.failed = true;

    maybeAutoStart({ pathname: '/', viewportWidth: 1280 });

    expect(tour.status).toBe('idle');
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

    expect(preferencesState.value.tour).toBeUndefined();
    expect(hasCompletedTour()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('still suppresses the automatic tour when the API refuses the write', () => {
    vi.mocked(api.preferences.save).mockRejectedValue(new Error('offline'));
    signIn('offline-account');
    maybeAutoStart({ pathname: '/reports', viewportWidth: 1280 });

    expect(hasCompletedTour()).toBe(false);

    skipTour();

    expect(hasCompletedTour()).toBe(true);
  });
});

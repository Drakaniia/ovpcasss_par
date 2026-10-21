import { describe, expect, it } from 'vitest';

import {
  TOUR_VERSION,
  clearTourRecord,
  isTourComplete,
  readTourRecord,
  tourKey,
  writeTourOutcome,
  type StorageLike,
} from './tour-storage';

function fakeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  } satisfies StorageLike & { map: Map<string, string> };

  return storage;
}

describe('tour storage', () => {
  it('starts incomplete and remembers either outcome', () => {
    const storage = fakeStorage();

    expect(isTourComplete('account-1', storage)).toBe(false);

    writeTourOutcome('account-1', 'completed', storage);
    expect(isTourComplete('account-1', storage)).toBe(true);

    writeTourOutcome('account-1', 'skipped', storage);
    expect(readTourRecord('account-1', storage)).toMatchObject({
      version: TOUR_VERSION,
      outcome: 'skipped',
    });
  });

  it('namespaces the key per account', () => {
    const storage = fakeStorage();

    writeTourOutcome('account-1', 'completed', storage);

    expect(tourKey('account-1')).toBe('par.onboarding.tour.account-1');
    expect(isTourComplete('account-2', storage)).toBe(false);
  });

  it('treats an older version as absent, so a bump re-arms the tour', () => {
    const storage = fakeStorage({
      [tourKey('account-1')]: JSON.stringify({
        version: TOUR_VERSION - 1,
        outcome: 'completed',
        at: '2026-10-20T00:00:00.000Z',
      }),
    });

    expect(isTourComplete('account-1', storage)).toBe(false);
  });

  it('ignores corrupt, empty or wrongly shaped records', () => {
    for (const value of [
      'not json',
      '',
      'null',
      '[]',
      JSON.stringify({ version: TOUR_VERSION, at: '2026-10-20T00:00:00.000Z' }),
      JSON.stringify({ version: TOUR_VERSION, outcome: 'finished', at: 'x' }),
    ]) {
      const storage = fakeStorage({ [tourKey('account-1')]: value });
      expect(readTourRecord('account-1', storage)).toBeNull();
    }
  });

  it('clears the record without touching another account', () => {
    const storage = fakeStorage();
    writeTourOutcome('account-1', 'completed', storage);
    writeTourOutcome('account-2', 'completed', storage);

    clearTourRecord('account-1', storage);

    expect(isTourComplete('account-1', storage)).toBe(false);
    expect(isTourComplete('account-2', storage)).toBe(true);
  });

  it('never throws when storage refuses every operation', () => {
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

    expect(() => readTourRecord('account-1', refusing)).not.toThrow();
    expect(readTourRecord('account-1', refusing)).toBeNull();
    expect(() => writeTourOutcome('account-1', 'completed', refusing)).not.toThrow();
    expect(() => clearTourRecord('account-1', refusing)).not.toThrow();
  });

  it('reads as absent when no storage exists at all', () => {
    expect(readTourRecord('account-1', null)).toBeNull();
    expect(isTourComplete('account-1', null)).toBe(false);
  });
});

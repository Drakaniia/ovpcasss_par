import type { LocationSuggestion } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  mergeSuggestions,
  normalizeLocation,
  rankLocations,
  withoutHiddenLocations,
} from './location-suggestions';

function office(location: string, lastUsedAt = '2026-03-01T00:00:00.000Z'): LocationLocation {
  return { location, lastUsedAt, source: 'office' };
}

function address(location: string): LocationLocation {
  return { location, source: 'address' };
}

type LocationLocation = LocationSuggestion;

describe('normalizeLocation', () => {
  it('keeps one line and the form limit', () => {
    expect(normalizeLocation('  Brgy.   Casisang \n Malaybalay ')).toBe(
      'Brgy. Casisang Malaybalay',
    );
    expect(normalizeLocation('a'.repeat(400))).toHaveLength(300);
  });
});

describe('rankLocations', () => {
  it('puts prefix matches first and dedupes case-insensitively', () => {
    const ranked = rankLocations(
      [office('Gymnasium, Bukidnon State University'), office('University Gymnasium')],
      'gym',
    );

    expect(ranked.map((item) => item.location)).toEqual([
      'Gymnasium, Bukidnon State University',
      'University Gymnasium',
    ]);
  });
});

describe('withoutHiddenLocations', () => {
  it('drops a removed history row and keeps the addresses', () => {
    const visible = withoutHiddenLocations(
      [office('Malaybalay City Gymnasium'), address('Casisang, Malaybalay City')],
      ['malaybalay city gymnasium '],
    );

    expect(visible.map((item) => item.location)).toEqual(['Casisang, Malaybalay City']);
  });

  it('leaves the list alone when nothing is hidden', () => {
    const items = [office('Gymnasium')];
    expect(withoutHiddenLocations(items, [])).toEqual(items);
  });
});

describe('mergeSuggestions', () => {
  it('leads with the office history and then the addresses', () => {
    const merged = mergeSuggestions(
      [office('Malaybalay City Gymnasium')],
      [address('Casisang, Malaybalay City, Bukidnon, Philippines')],
    );

    expect(merged.map((item) => item.location)).toEqual([
      'Malaybalay City Gymnasium',
      'Casisang, Malaybalay City, Bukidnon, Philippines',
    ]);
    expect(merged.map((item) => item.source)).toEqual(['office', 'address']);
  });

  it('keeps the office spelling when a provider repeats the venue', () => {
    const merged = mergeSuggestions(
      [office('malaybalay city gymnasium')],
      [address('Malaybalay City Gymnasium')],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.location).toBe('malaybalay city gymnasium');
    expect(merged[0]?.source).toBe('office');
  });

  it('never grows past eight rows', () => {
    const merged = mergeSuggestions(
      Array.from({ length: 8 }, (_, index) => office(`Venue ${index}`)),
      [address('Address one'), address('Address two')],
    );

    expect(merged).toHaveLength(8);
  });

  it('answers what it has when one half is empty', () => {
    expect(mergeSuggestions([], [])).toEqual([]);
    expect(mergeSuggestions([office('Gymnasium')], [])).toHaveLength(1);
    expect(mergeSuggestions([], [address('Casisang')])).toHaveLength(1);
  });
});

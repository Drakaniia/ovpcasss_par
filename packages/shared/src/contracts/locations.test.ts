import { describe, expect, it } from 'vitest';

import { joinLocationList, splitLocationList } from './locations';

describe('splitLocationList', () => {
  it('splits the stored text into trimmed venues', () => {
    expect(splitLocationList(' Brgy. Casisang ;  Malaybalay City ; ')).toEqual([
      'Brgy. Casisang',
      'Malaybalay City',
    ]);
  });

  it('answers nothing for an empty location', () => {
    expect(splitLocationList('')).toEqual([]);
    expect(splitLocationList('   ')).toEqual([]);
  });
});

describe('joinLocationList', () => {
  it('joins venue rows into the text a report stores', () => {
    expect(joinLocationList(['Brgy. Casisang', 'Malaybalay City'])).toBe(
      'Brgy. Casisang; Malaybalay City',
    );
  });

  it('trims rows and drops the blanks', () => {
    expect(joinLocationList(['  Brgy. Casisang ', '', '   ', 'Malaybalay City'])).toBe(
      'Brgy. Casisang; Malaybalay City',
    );
    expect(joinLocationList(['', ' '])).toBe('');
  });
});

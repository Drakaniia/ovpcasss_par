import { describe, expect, it } from 'vitest';

import {
  formatReferenceNo,
  parseReferenceNo,
  referenceSearchTerms,
  REFERENCE_PREFIX,
} from './reference-number';

describe('formatReferenceNo', () => {
  it('pads to four digits and grows past them', () => {
    expect(REFERENCE_PREFIX).toBe('AR No.');
    expect(formatReferenceNo(1)).toBe('AR No. 0001');
    expect(formatReferenceNo(42)).toBe('AR No. 0042');
    expect(formatReferenceNo(9999)).toBe('AR No. 9999');
    expect(formatReferenceNo(10000)).toBe('AR No. 10000');
  });

  it('refuses a sequence that cannot be an AR No.', () => {
    expect(() => formatReferenceNo(0)).toThrow(RangeError);
    expect(() => formatReferenceNo(-1)).toThrow(RangeError);
    expect(() => formatReferenceNo(1.5)).toThrow(RangeError);
  });
});

describe('parseReferenceNo', () => {
  it('reads the sequence out of every spelling the search may receive', () => {
    expect(parseReferenceNo('AR No. 0001')).toBe(1);
    expect(parseReferenceNo('0001')).toBe(1);
    expect(parseReferenceNo('ar no 0001')).toBe(1);
    expect(parseReferenceNo('AR No. 10000')).toBe(10000);
  });

  it('returns null when there is no usable sequence', () => {
    expect(parseReferenceNo('')).toBeNull();
    expect(parseReferenceNo('AR No.')).toBeNull();
    expect(parseReferenceNo('0000')).toBeNull();
  });
});

describe('referenceSearchTerms', () => {
  it('accepts the digits, the printed form, and the punctuation-free spelling', () => {
    const terms = referenceSearchTerms('ar no 0001');

    expect(terms).toContain('0001');
    expect(terms).toContain('AR No. 0001');
    expect(terms).toContain('AR No 0001');
  });

  it('keeps a plain word search as it was typed', () => {
    expect(referenceSearchTerms('cleanup')).toEqual(['cleanup']);
  });
});

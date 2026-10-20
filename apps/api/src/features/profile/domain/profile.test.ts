import { describe, expect, it } from 'vitest';

import { normalizeOptional } from './profile';

describe('normalizeOptional', () => {
  it('keeps real text, trimmed', () => {
    expect(normalizeOptional('  College of Arts and Sciences  ')).toBe('College of Arts and Sciences');
  });

  it('turns an omitted, empty, or whitespace value into null', () => {
    expect(normalizeOptional(undefined)).toBeNull();
    expect(normalizeOptional('')).toBeNull();
    expect(normalizeOptional('   ')).toBeNull();
  });
});

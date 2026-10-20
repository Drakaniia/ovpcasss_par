import { describe, expect, it } from 'vitest';

import { isSelfTarget } from './admin-guard';

describe('isSelfTarget', () => {
  it('is true only when the actor and the target are the same account', () => {
    expect(isSelfTarget('u1', 'u1')).toBe(true);
  });

  it('is false when the target is another account', () => {
    expect(isSelfTarget('u1', 'u2')).toBe(false);
  });
});

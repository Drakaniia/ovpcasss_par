import { describe, expect, it } from 'vitest';

import { preferencesPatchSchema, preferencesSchema } from './preferences';

const account = { id: 'a', name: 'Account A', email: 'a@buksu.edu.ph' };

describe('remembered account preferences', () => {
  it('accepts names only in reads and patches, including forgetting every account', () => {
    expect(preferencesSchema.parse({ rememberedAccounts: [account] })).toEqual({
      rememberedAccounts: [account],
    });
    expect(preferencesPatchSchema.parse({ rememberedAccounts: [] })).toEqual({
      rememberedAccounts: [],
    });
  });

  it('rejects invalid identities and unbounded account lists', () => {
    expect(
      preferencesPatchSchema.safeParse({
        rememberedAccounts: [{ ...account, email: 'not an email' }],
      }).success,
    ).toBe(false);
    expect(
      preferencesPatchSchema.safeParse({
        rememberedAccounts: Array.from({ length: 21 }, () => account),
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import type { Env } from '../../../env';
import { signingConfigured } from './r2-presign';

/** Only the three signing values matter here; the rest of the bindings are absent. */
const env = (values: Partial<Env>) => values as Env;

describe('signingConfigured', () => {
  it('accepts a full set of values', () => {
    expect(
      signingConfigured(
        env({ R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret' }),
      ),
    ).toBe(true);
  });

  it('treats the .dev.vars placeholders as unconfigured', () => {
    expect(
      signingConfigured(
        env({
          R2_ACCOUNT_ID: 'replace-me',
          R2_ACCESS_KEY_ID: 'key',
          R2_SECRET_ACCESS_KEY: 'secret',
        }),
      ),
    ).toBe(false);
  });

  it('is unconfigured when any value is empty or missing', () => {
    expect(
      signingConfigured(
        env({ R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: 's' }),
      ),
    ).toBe(false);
    expect(signingConfigured(env({ R2_ACCOUNT_ID: 'acct' }))).toBe(false);
  });
});

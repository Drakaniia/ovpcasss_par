import { describe, expect, it } from 'vitest';

import { resolveAppOrigin } from './app-origin';

describe('resolveAppOrigin', () => {
  it('uses the configured app origin when there is one', () => {
    expect(
      resolveAppOrigin('https://ovpcasss-par.pages.dev', 'https://par.ovpcassss.workers.dev/x'),
    ).toBe('https://ovpcasss-par.pages.dev');
  });

  it('falls back to the request origin locally and in tests', () => {
    expect(resolveAppOrigin(undefined, 'http://localhost:8787/api/v1/auth/login')).toBe(
      'http://localhost:8787',
    );
  });

  it('treats a blank value as unset', () => {
    expect(resolveAppOrigin('  ', 'http://localhost:8787/')).toBe('http://localhost:8787');
  });

  it('drops a trailing slash so concatenated paths stay absolute', () => {
    expect(resolveAppOrigin('https://ovpcasss-par.pages.dev/', 'http://localhost/')).toBe(
      'https://ovpcasss-par.pages.dev',
    );
  });
});

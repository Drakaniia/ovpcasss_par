import { describe, expect, it } from 'vitest';

import { resolveAppOrigin, resolveClientOrigin } from './app-origin';

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

describe('resolveClientOrigin', () => {
  const request = 'https://par.ovpcasss.workers.dev/api/v1/reports/r1/attachments/presign';

  it('keeps a browser on the origin that served it', () => {
    expect(resolveClientOrigin(request, 'https://ovpcasss-par.pages.dev', true)).toBe(
      'https://ovpcasss-par.pages.dev',
    );
    expect(resolveClientOrigin(request, 'http://localhost:5173/', true)).toBe(
      'http://localhost:5173',
    );
  });

  it('sends a bearer-token client to this API, not the published site', () => {
    expect(resolveClientOrigin(request, 'http://tauri.localhost', false)).toBe(
      'https://par.ovpcasss.workers.dev',
    );
  });

  it('falls back to the request origin when a cookie write names no origin', () => {
    expect(resolveClientOrigin(request, undefined, true)).toBe('https://par.ovpcasss.workers.dev');
  });

  it('ignores an opaque origin and a non-web scheme', () => {
    expect(resolveClientOrigin(request, 'null', true)).toBe('https://par.ovpcasss.workers.dev');
    expect(resolveClientOrigin(request, 'tauri://localhost', true)).toBe(
      'https://par.ovpcasss.workers.dev',
    );
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildGoogleAuthUrl,
  decodeStateCookie,
  desktopRedirect,
  encodeStateCookie,
  parseDesktopStart,
} from './google';

describe('buildGoogleAuthUrl', () => {
  it('carries the code-flow parameters and URL-encodes the callback', () => {
    const url = new URL(
      buildGoogleAuthUrl({
        clientId: 'client-id',
        redirectUri: 'http://localhost:5173/api/v1/auth/google/callback',
        state: 'state-token',
      }),
    );

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/v1/auth/google/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('state-token');
  });
});

describe('parseDesktopStart', () => {
  it('accepts a loopback port and nonce from the desktop shell', () => {
    expect(
      parseDesktopStart({ client: 'desktop', port: '49152', nonce: 'abcDEF1234567890' }),
    ).toEqual({ port: 49152, nonce: 'abcDEF1234567890' });
  });

  it('treats an ordinary web request as not desktop', () => {
    expect(parseDesktopStart({})).toBeNull();
    expect(
      parseDesktopStart({ client: 'web', port: '49152', nonce: 'abcDEF1234567890' }),
    ).toBeNull();
  });

  it('rejects a bad port or nonce', () => {
    expect(
      parseDesktopStart({ client: 'desktop', port: '80', nonce: 'abcDEF1234567890' }),
    ).toBeNull();
    expect(parseDesktopStart({ client: 'desktop', port: '49152', nonce: 'short' })).toBeNull();
    expect(
      parseDesktopStart({ client: 'desktop', port: 'x', nonce: 'abcDEF1234567890' }),
    ).toBeNull();
  });
});

describe('state cookie', () => {
  it('round-trips a web state untouched', () => {
    expect(decodeStateCookie(encodeStateCookie('state-token', null))).toEqual({
      state: 'state-token',
      desktop: null,
    });
  });

  it('round-trips the desktop hand-off details', () => {
    const desktop = { port: 49152, nonce: 'abcDEF1234567890' };
    expect(decodeStateCookie(encodeStateCookie('state-token', desktop))).toEqual({
      state: 'state-token',
      desktop,
    });
  });
});

describe('desktopRedirect', () => {
  const desktop = { port: 49152, nonce: 'abcDEF1234567890' };

  it('hands the token to the loopback listener', () => {
    const url = new URL(desktopRedirect(desktop, { token: 'opaque-token' }));

    expect(url.origin).toBe('http://127.0.0.1:49152');
    expect(url.searchParams.get('token')).toBe('opaque-token');
    expect(url.searchParams.get('nonce')).toBe(desktop.nonce);
  });

  it('reports failures to the same listener', () => {
    const url = new URL(desktopRedirect(desktop, { error: 'google_domain' }));

    expect(url.searchParams.get('error')).toBe('google_domain');
    expect(url.searchParams.has('token')).toBe(false);
  });
});

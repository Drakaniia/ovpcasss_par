import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch, apiUpload, setSessionToken, validationIssues } from './http';

function mockFetch(): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function headersOf(fetch: ReturnType<typeof vi.fn>, call = 0): Headers {
  return (fetch.mock.calls[call]?.[1]?.headers ?? new Headers()) as Headers;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionToken(null);
});

describe('http client desktop session', () => {
  it('sends the bearer token once the desktop store supplied one', async () => {
    const fetch = mockFetch();
    setSessionToken('opaque-token');

    await apiFetch('/me');

    expect(headersOf(fetch).get('authorization')).toBe('Bearer opaque-token');
  });

  it('sends no authorization header on the web session', async () => {
    const fetch = mockFetch();

    await apiFetch('/me');

    expect(headersOf(fetch).has('authorization')).toBe(false);
  });

  it('identifies the desktop shell so login may return the token', async () => {
    const fetch = mockFetch();
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });

    await apiFetch('/auth/login', { method: 'POST', body: '{}' });

    expect(headersOf(fetch).get('x-par-client')).toBe('desktop');
  });

  it('omits the shell header in the browser', async () => {
    const fetch = mockFetch();
    vi.stubGlobal('window', {});

    await apiFetch('/me');

    expect(headersOf(fetch).has('x-par-client')).toBe(false);
  });

  it('keeps the field-level details of a validation error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Check the highlighted fields',
                details: [{ field: 'attachments', message: '1 attachment is still uploading.' }],
              },
            }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );

    const failure = await apiFetch('/reports/1/submit').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(validationIssues(failure)).toEqual([
      { field: 'attachments', message: '1 attachment is still uploading.' },
    ]);
  });

  it('reports no issues when the response carried none', () => {
    expect(validationIssues(new ApiError(500, 'INTERNAL_ERROR', 'boom'))).toEqual([]);
    expect(validationIssues(null)).toEqual([]);
  });

  it('lets the browser set the multipart boundary', async () => {
    const fetch = mockFetch();
    setSessionToken('opaque-token');

    await apiUpload('/imports/monitoring', new FormData());

    const headers = headersOf(fetch);
    expect(headers.has('content-type')).toBe(false);
    expect(headers.get('authorization')).toBe('Bearer opaque-token');
  });
});

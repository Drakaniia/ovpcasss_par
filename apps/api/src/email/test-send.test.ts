import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../env';
import { sendTestEmail, testEmailContent } from './test-send';

// The stored sender has its own test; these cover the test message and adapter.
vi.mock('./sender', () => ({
  emailSenderFor: async (env: Env) => ({
    from: env.EMAIL_FROM,
    apiKey: env.EMAIL_API_KEY,
    source: 'environment' as const,
  }),
}));

function envWith(overrides: Partial<Env> = {}): Env {
  return {
    EMAIL_PROVIDER: 'brevo',
    EMAIL_API_KEY: 'key-123',
    EMAIL_FROM: 'OVPCASSS PAR <par@example.edu>',
    ...overrides,
  } as unknown as Env;
}

function stubFetch(status = 200, body = '{}') {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('testEmailContent', () => {
  it('names the one recipient and says nothing else happened', () => {
    const content = testEmailContent('admin@buksu.edu.ph', new Date('2026-11-02T02:30:00.000Z'));

    expect(content.subject).toContain('[OVPCASSS PAR]');
    expect(content.text).toContain('admin@buksu.edu.ph');
    expect(content.text).toContain('No report, receipt, or account notice was created');
    expect(content.html).toContain('admin@buksu.edu.ph');
  });
});

describe('sendTestEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends to the one address and names the adapter', async () => {
    const fetchMock = stubFetch();

    expect(await sendTestEmail(envWith(), 'admin@buksu.edu.ph')).toEqual({ provider: 'brevo' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: [{ email: 'admin@buksu.edu.ph' }],
    });
  });

  it("raises the provider's reason so the page can print it", async () => {
    stubFetch(401, '{"message":"Key not found"}');

    await expect(sendTestEmail(envWith(), 'admin@buksu.edu.ph')).rejects.toThrow(
      'Brevo rejected the message (401)',
    );
  });

  it('prints instead of delivering under the console adapter', async () => {
    const fetchMock = stubFetch();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(
      await sendTestEmail(envWith({ EMAIL_PROVIDER: 'console' }), 'admin@buksu.edu.ph'),
    ).toEqual({ provider: 'console' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('to=admin@buksu.edu.ph'));

    log.mockRestore();
  });
});

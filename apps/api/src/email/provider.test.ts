import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../env';
import { createEmailProvider } from './provider';

const message = {
  to: '2401115560@student.buksu.edu.ph',
  subject: '[OVPCASSS PAR] AR No. 0001 — acknowledgment receipt',
  html: '<p>Your receipt is attached.</p>',
  text: 'Your receipt is attached.',
};

function envWith(overrides: Partial<Env> = {}): Env {
  return {
    EMAIL_PROVIDER: 'brevo',
    EMAIL_API_KEY: 'key-123',
    EMAIL_FROM: 'OVPCASSS PAR <par@example.edu>',
    ...overrides,
  } as unknown as Env;
}

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function bodyOf(fetchMock: ReturnType<typeof stubFetch>): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

describe('createEmailProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends through Brevo to the real recipient and points replies at the office', async () => {
    const fetchMock = stubFetch();

    await createEmailProvider(envWith({ EMAIL_REPLY_TO: 'ovpcasss@buksu.edu.ph' })).send(message);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(bodyOf(fetchMock)).toMatchObject({
      sender: { name: 'OVPCASSS PAR', email: 'par@example.edu' },
      replyTo: { email: 'ovpcasss@buksu.edu.ph' },
      to: [{ email: '2401115560@student.buksu.edu.ph' }],
    });
  });

  it('sends through Resend when that provider is selected', async () => {
    const fetchMock = stubFetch();

    await createEmailProvider(envWith({ EMAIL_PROVIDER: 'resend' })).send(message);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(bodyOf(fetchMock).to).toEqual(['2401115560@student.buksu.edu.ph']);
  });

  it('sends nothing when the console adapter is selected', async () => {
    const fetchMock = stubFetch();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await createEmailProvider(envWith({ EMAIL_PROVIDER: 'console' })).send(message);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('to=2401115560@student.buksu.edu.ph'));

    log.mockRestore();
  });
});

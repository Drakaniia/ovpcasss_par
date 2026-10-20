import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EmailMessage } from '../provider';
import { createResendProvider } from './resend';

const message: EmailMessage = {
  to: 'reviewer@example.edu',
  subject: 'PAR OFF-2026-0014 is ready for review',
  html: '<p>M. Santos submitted a report.</p>',
  text: 'M. Santos submitted a report.',
};

const FROM = 'OVPCASSS PAR <par@example.edu>';

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createResendProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the message to the Resend API with the key as a bearer token', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }));

    await createResendProvider('key-123', FROM).send(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer key-123');
    expect(JSON.parse(String(init.body))).toEqual({
      from: FROM,
      to: ['reviewer@example.edu'],
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  });

  it('rejects with the status and the reason Resend gave', async () => {
    stubFetch(new Response('The domain is not verified', { status: 403 }));

    await expect(createResendProvider('key-123', FROM).send(message)).rejects.toThrow(
      /403.*not verified/,
    );
  });

  it('rejects when the API is unreachable', async () => {
    stubFetch(new Response(null, { status: 502 }));

    await expect(createResendProvider('key-123', FROM).send(message)).rejects.toThrow(/502/);
  });

  /**
   * Live send, run only when a key is present: it talks to the real Resend API.
   *
   *   set -a; . apps/api/.dev.vars; set +a
   *   LIVE_EMAIL=1 LIVE_EMAIL_TO=you@example.edu pnpm --filter @par/email test
   */
  const live = process.env.LIVE_EMAIL === '1';
  it.runIf(live)('delivers through the live Resend API', async () => {
    const provider = createResendProvider(
      process.env.EMAIL_API_KEY ?? '',
      process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
    );

    await expect(
      provider.send({
        to: process.env.LIVE_EMAIL_TO ?? '',
        subject: 'OVPCASSS PAR notification test',
        text: 'Delivery check from the notifications phase. No action is required.',
        html: '<p>Delivery check from the notifications phase. No action is required.</p>',
      }),
    ).resolves.toBeUndefined();
  });
});

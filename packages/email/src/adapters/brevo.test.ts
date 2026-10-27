import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EmailMessage } from '../provider';
import { createBrevoProvider } from './brevo';

const message: EmailMessage = {
  to: '2401115560@student.buksu.edu.ph',
  subject: '[OVPCASSS PAR] AR No. 0001 — acknowledgment receipt',
  html: '<p>Your receipt is attached.</p>',
  text: 'Your receipt is attached.',
};

const FROM = 'OVPCASSS PAR <par@example.edu>';

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function bodyOf(fetchMock: ReturnType<typeof stubFetch>): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

describe('createBrevoProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the message to the Brevo API with the key in api-key', async () => {
    const fetchMock = stubFetch(new Response('{"messageId":"1"}', { status: 201 }));

    await createBrevoProvider('key-123', FROM).send(message);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe('key-123');
    expect(JSON.parse(String(init.body))).toEqual({
      sender: { name: 'OVPCASSS PAR', email: 'par@example.edu' },
      to: [{ email: '2401115560@student.buksu.edu.ph' }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    });
  });

  it('accepts a bare address as the sender', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 201 }));

    await createBrevoProvider('key-123', 'par@example.edu').send(message);

    expect(bodyOf(fetchMock).sender).toEqual({ email: 'par@example.edu' });
  });

  it('sends attachments as base64 and leaves the idempotency key off', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 201 }));

    await createBrevoProvider('key-123', FROM).send({
      ...message,
      idempotencyKey: 'outbox-1',
      attachments: [
        { filename: 'ack.pdf', contentType: 'application/pdf', content: new Uint8Array([1, 2, 3]) },
      ],
    });

    const body = bodyOf(fetchMock);
    expect(body.attachment).toEqual([{ name: 'ack.pdf', content: 'AQID' }]);
    expect(body.headers).toBeUndefined();
  });

  it('routes replies to the configured address', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 201 }));

    await createBrevoProvider('key-123', FROM, { replyTo: 'ovpcasss@buksu.edu.ph' }).send(message);

    expect(bodyOf(fetchMock).replyTo).toEqual({ email: 'ovpcasss@buksu.edu.ph' });
  });

  it('omits the optional fields when the message has none', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 201 }));

    await createBrevoProvider('key-123', FROM).send(message);

    const body = bodyOf(fetchMock);
    expect(body.attachment).toBeUndefined();
    expect(body.replyTo).toBeUndefined();
  });

  it('rejects with the status and the reason Brevo gave', async () => {
    stubFetch(new Response('{"message":"Sender not valid"}', { status: 400 }));

    await expect(createBrevoProvider('key-123', FROM).send(message)).rejects.toThrow(
      /400.*Sender not valid/,
    );
  });

  it('rejects when the API is unreachable', async () => {
    stubFetch(new Response(null, { status: 502 }));

    await expect(createBrevoProvider('key-123', FROM).send(message)).rejects.toThrow(/502/);
  });
});

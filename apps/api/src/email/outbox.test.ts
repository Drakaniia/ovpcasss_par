import { describe, expect, it } from 'vitest';

import type { Env } from '../env';
import { messageKeyFor, readRowMessage } from './outbox';

const message = {
  to: '2401115560@student.buksu.edu.ph',
  subject: '[OVPCASSS PAR] Verify your email address',
  html: '<p>Confirm</p>',
  text: 'Verify your email address\nhttps://par.test/verify-email?token=abc',
};

function envWith(objects: Record<string, unknown>): Env {
  return {
    BUCKET: {
      async get(key: string) {
        const stored = objects[key];
        if (stored === undefined) return null;
        return { text: async () => JSON.stringify(stored) };
      },
    },
  } as unknown as Env;
}

function payload(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ subject: message.subject, reportId: null, attachments: [], ...extra });
}

describe('readRowMessage', () => {
  it('returns the copy stored under the payload reference', async () => {
    const key = messageKeyFor('outbox-1');
    expect(await readRowMessage(envWith({ [key]: message }), payload({ messageKey: key }))).toEqual(
      message,
    );
  });

  it('returns null for a row that never stored a copy, such as a suppressed message', async () => {
    expect(await readRowMessage(envWith({}), payload())).toBeNull();
  });

  it('returns null when R2 no longer holds the object', async () => {
    const key = messageKeyFor('outbox-2');
    expect(await readRowMessage(envWith({}), payload({ messageKey: key }))).toBeNull();
  });

  it('returns null when the payload is not readable JSON', async () => {
    expect(await readRowMessage(envWith({}), 'not json')).toBeNull();
  });
});

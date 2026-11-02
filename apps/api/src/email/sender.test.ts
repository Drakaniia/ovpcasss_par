import { describe, expect, it } from 'vitest';

import { resolveEmailSender, senderKeyHint } from './sender';

const ENV = {
  EMAIL_FROM: 'OVPCASSS PAR <par@buksu.edu.ph>',
  EMAIL_API_KEY: 'xkeysib-deployment-key',
};

describe('resolveEmailSender', () => {
  it('prefers the sender and key saved by the administrator', () => {
    expect(
      resolveEmailSender(
        { from: 'OVPCASSS <ovpcasss@buksu.edu.ph>', apiKey: 'xkeysib-saved-key' },
        ENV,
      ),
    ).toEqual({
      from: 'OVPCASSS <ovpcasss@buksu.edu.ph>',
      apiKey: 'xkeysib-saved-key',
      source: 'database',
    });
  });

  it('falls back to the Worker variables when nothing is saved', () => {
    expect(resolveEmailSender(null, ENV)).toEqual({
      from: 'OVPCASSS PAR <par@buksu.edu.ph>',
      apiKey: 'xkeysib-deployment-key',
      source: 'environment',
    });
  });

  it('ignores a half-saved or corrupt row', () => {
    expect(resolveEmailSender({ from: 'ovpcasss@buksu.edu.ph' }, ENV).source).toBe('environment');
    expect(resolveEmailSender({ from: '', apiKey: '' }, ENV).source).toBe('environment');
    expect(resolveEmailSender('not-a-sender', ENV).source).toBe('environment');
  });
});

describe('senderKeyHint', () => {
  it('names the last four characters and nothing more', () => {
    expect(senderKeyHint('xkeysib-1234abcd')).toBe('…abcd');
    expect(senderKeyHint('  key-9f8e  ')).toBe('…9f8e');
  });

  it('has nothing to show for an empty or very short key', () => {
    expect(senderKeyHint('')).toBe('');
    expect(senderKeyHint('abc')).toBe('');
  });
});

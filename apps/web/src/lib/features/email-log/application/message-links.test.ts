import { describe, expect, it } from 'vitest';

import { linksInText } from './message-links';

const body = [
  'Good day.',
  '',
  'Hello Maria. An account was registered for this address.',
  '',
  'Verify your email address',
  'https://par-api.example.workers.dev/verify-email?token=abc123&email=maria%40buksu.edu.ph',
  '',
  'This message was sent by the OVPCASSS Paperless PAR system. Please do not reply.',
].join('\n');

describe('linksInText', () => {
  it('finds the action link in a verification message', () => {
    expect(linksInText(body)).toEqual([
      'https://par-api.example.workers.dev/verify-email?token=abc123&email=maria%40buksu.edu.ph',
    ]);
  });

  it('drops trailing punctuation that belongs to the sentence', () => {
    expect(linksInText('Open https://par.test/reset-password?token=abc.')).toEqual([
      'https://par.test/reset-password?token=abc',
    ]);
    expect(linksInText('Open (https://par.test/login) to continue')).toEqual([
      'https://par.test/login',
    ]);
  });

  it('lists a repeated link once', () => {
    expect(linksInText('https://par.test/login\n\nhttps://par.test/login')).toEqual([
      'https://par.test/login',
    ]);
  });

  it('returns nothing for a message with no link', () => {
    expect(linksInText('Your account is active.')).toEqual([]);
  });
});

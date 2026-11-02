import { describe, expect, it } from 'vitest';

import { hasUnsavedSenderChanges, validateSenderDraft } from './email-sender';

describe('validateSenderDraft', () => {
  it('accepts a sender and a new key, trimmed', () => {
    expect(validateSenderDraft({ from: ' par@buksu.edu.ph ', apiKey: ' key-1 ' }, false)).toEqual({
      errors: {},
      input: { from: 'par@buksu.edu.ph', apiKey: 'key-1' },
    });
  });

  it('keeps the saved key when the field is blank', () => {
    expect(validateSenderDraft({ from: 'par@buksu.edu.ph', apiKey: '   ' }, true)).toEqual({
      errors: {},
      input: { from: 'par@buksu.edu.ph' },
    });
  });

  it('asks for a key when none is saved yet', () => {
    const result = validateSenderDraft({ from: 'par@buksu.edu.ph', apiKey: '' }, false);

    expect(result.errors.apiKey).toBe('Enter the API key.');
    expect(result.input).toBeNull();
  });

  it('asks for an address the provider can send from', () => {
    expect.assertions(2);

    const blank = validateSenderDraft({ from: '  ', apiKey: 'key-1' }, false);
    expect(blank.errors.from).toBe('Enter the sending address.');

    const noAt = validateSenderDraft({ from: 'OVPCASSS PAR', apiKey: 'key-1' }, false);
    expect(noAt.errors.from).toBe('Enter a sending address with an @.');
  });
});

describe('hasUnsavedSenderChanges', () => {
  it('is false when the form still matches the saved pair', () => {
    expect(
      hasUnsavedSenderChanges({ from: ' par@buksu.edu.ph ', apiKey: '' }, 'par@buksu.edu.ph'),
    ).toBe(false);
  });

  it('is true once a key is typed or the address is edited', () => {
    expect(
      hasUnsavedSenderChanges({ from: 'par@buksu.edu.ph', apiKey: 'key-1' }, 'par@buksu.edu.ph'),
    ).toBe(true);
    expect(
      hasUnsavedSenderChanges({ from: 'new@buksu.edu.ph', apiKey: '' }, 'par@buksu.edu.ph'),
    ).toBe(true);
  });
});

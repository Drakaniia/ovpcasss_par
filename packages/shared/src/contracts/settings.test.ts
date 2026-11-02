import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECEIPT_SIGNATORY,
  emailSenderInputSchema,
  emailSenderResponseSchema,
  emailSenderSchema,
  emailTestInputSchema,
  emailTestResponseSchema,
  receiptSignatorySchema,
  receiptSignatoryResponseSchema,
} from './settings';

describe('receiptSignatorySchema', () => {
  it('accepts a name and a position', () => {
    expect(receiptSignatorySchema.parse({ name: '  DR. A. B. Cruz ', title: 'VPCASSS' })).toEqual({
      name: 'DR. A. B. Cruz',
      title: 'VPCASSS',
    });
  });

  it('refuses an empty half', () => {
    expect(receiptSignatorySchema.safeParse({ name: '   ', title: 'VPCASSS' }).success).toBe(false);
    expect(receiptSignatorySchema.safeParse({ name: 'Name', title: '' }).success).toBe(false);
  });

  it('keeps the office default available to a renderer', () => {
    expect(receiptSignatorySchema.parse(DEFAULT_RECEIPT_SIGNATORY)).toEqual({
      name: 'DR. LINCOLN V. TAN',
      title: 'VPCASSS',
    });
    expect(receiptSignatoryResponseSchema.shape.signatory).toBe(receiptSignatorySchema);
  });
});

describe('emailSenderSchema', () => {
  it('keeps a sending address and its key', () => {
    expect(
      emailSenderSchema.parse({ from: '  OVPCASSS PAR <par@buksu.edu.ph> ', apiKey: 'xkeysib-1' }),
    ).toEqual({ from: 'OVPCASSS PAR <par@buksu.edu.ph>', apiKey: 'xkeysib-1' });
  });

  it('refuses an empty key when one is given at all', () => {
    expect(emailSenderSchema.safeParse({ from: 'par@buksu.edu.ph', apiKey: '' }).success).toBe(
      false,
    );
  });
});

describe('emailSenderInputSchema', () => {
  it('accepts a sender with or without a replacement key', () => {
    expect(emailSenderInputSchema.parse({ from: ' par@buksu.edu.ph ' })).toEqual({
      from: 'par@buksu.edu.ph',
    });
    expect(
      emailSenderInputSchema.parse({ from: 'OVPCASSS PAR <par@buksu.edu.ph>', apiKey: 'key-1' }),
    ).toEqual({ from: 'OVPCASSS PAR <par@buksu.edu.ph>', apiKey: 'key-1' });
  });

  it('requires an address the provider can send from', () => {
    expect(emailSenderInputSchema.safeParse({ from: 'OVPCASSS PAR' }).success).toBe(false);
  });

  it('never returns the key in a response', () => {
    expect(
      emailSenderResponseSchema.parse({
        from: 'par@buksu.edu.ph',
        apiKeySet: true,
        apiKeyHint: '…9f8e',
        source: 'database',
        provider: 'brevo',
      }),
    ).not.toHaveProperty('apiKey');
  });

  it('names the adapter the deployment selects', () => {
    const response = {
      from: 'par@buksu.edu.ph',
      apiKeySet: true,
      apiKeyHint: '…9f8e',
      source: 'database' as const,
    };

    expect(emailSenderResponseSchema.parse({ ...response, provider: 'console' }).provider).toBe(
      'console',
    );
    expect(emailSenderResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('emailTestInputSchema', () => {
  it('accepts one recipient and trims it', () => {
    expect(emailTestInputSchema.parse({ to: ' admin@buksu.edu.ph ' })).toEqual({
      to: 'admin@buksu.edu.ph',
    });
  });

  it('refuses a value that is not an address', () => {
    expect(emailTestInputSchema.safeParse({ to: 'admin' }).success).toBe(false);
    expect(emailTestInputSchema.safeParse({ to: '  ' }).success).toBe(false);
    expect(emailTestInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('emailTestResponseSchema', () => {
  it('names the adapter that carried the message', () => {
    expect(emailTestResponseSchema.parse({ to: 'admin@buksu.edu.ph', provider: 'brevo' })).toEqual({
      to: 'admin@buksu.edu.ph',
      provider: 'brevo',
    });
  });

  it('refuses an adapter this build does not have', () => {
    expect(emailTestResponseSchema.safeParse({ to: 'a@b.co', provider: 'smtp' }).success).toBe(
      false,
    );
  });
});

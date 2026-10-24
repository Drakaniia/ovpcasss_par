import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECEIPT_SIGNATORY,
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

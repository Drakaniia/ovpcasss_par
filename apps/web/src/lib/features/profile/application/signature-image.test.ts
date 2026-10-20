import { SIGNATURE_MAX_BYTES } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  SIGNATURE_ACCEPT,
  SIGNATURE_LIMIT_LABEL,
  dataUrlBytes,
  isAllowedSignatureType,
} from './signature-image';

describe('signature image rules', () => {
  it('accepts PNG and JPEG and nothing else', () => {
    expect(SIGNATURE_ACCEPT).toBe('image/png,image/jpeg');
    expect(isAllowedSignatureType('image/png')).toBe(true);
    expect(isAllowedSignatureType('image/jpeg')).toBe(true);
    expect(isAllowedSignatureType('image/svg+xml')).toBe(false);
    expect(isAllowedSignatureType('application/pdf')).toBe(false);
  });

  it('names the server limit in the copy', () => {
    expect(SIGNATURE_LIMIT_LABEL).toBe(`${Math.round(SIGNATURE_MAX_BYTES / 1_000_000)} MB`);
  });

  it('measures the decoded size of a data URL', () => {
    // Base64 without padding: 12 characters encode 9 bytes.
    expect(dataUrlBytes('data:image/png;base64,AAAAAAAAAAAA')).toBe(9);
    // Trailing `=` is padding, not payload.
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUrlBytes('data:image/png;base64,AAA=')).toBe(2);
    expect(dataUrlBytes('data:image/png;base64,AA==')).toBe(1);
    expect(dataUrlBytes('data:image/png;base64,')).toBe(0);
  });
});

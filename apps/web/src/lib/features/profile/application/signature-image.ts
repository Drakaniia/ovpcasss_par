import type { SignatureUploadInput } from '@par/shared';
import { SIGNATURE_IMAGE_TYPES, SIGNATURE_MAX_BYTES } from '@par/shared';

/**
 * Signature image rules (UI spec §7.14): PNG or JPEG, under the server's limit,
 * sent as a data URL because that is what both the canvas and the file input
 * produce. Validation runs before the upload so the limit is named, not guessed.
 */
export const SIGNATURE_ACCEPT = SIGNATURE_IMAGE_TYPES.join(',');

export const SIGNATURE_LIMIT_LABEL = `${Math.round(SIGNATURE_MAX_BYTES / 1_000_000)} MB`;

export function isAllowedSignatureType(type: string): boolean {
  return (SIGNATURE_IMAGE_TYPES as readonly string[]).includes(type);
}

/** Decoded byte length of a base64 data URL; the padding is not payload. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export type SignatureReadResult =
  { ok: true; image: SignatureUploadInput } | { ok: false; error: string };

export function readSignatureFile(file: File): Promise<SignatureReadResult> {
  if (!isAllowedSignatureType(file.type)) {
    return Promise.resolve({ ok: false, error: 'Use a PNG or JPEG image.' });
  }

  if (file.size > SIGNATURE_MAX_BYTES) {
    return Promise.resolve({
      ok: false,
      error: `Use an image under ${SIGNATURE_LIMIT_LABEL}.`,
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve({ ok: false, error: 'The file could not be read. Try again.' });
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl || dataUrlBytes(dataUrl) > SIGNATURE_MAX_BYTES) {
        resolve({ ok: false, error: `Use an image under ${SIGNATURE_LIMIT_LABEL}.` });
        return;
      }
      resolve({ ok: true, image: { image: dataUrl } });
    };

    reader.readAsDataURL(file);
  });
}

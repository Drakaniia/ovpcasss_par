import { SIGNATURE_MAX_BYTES } from '@par/shared';

/**
 * Signature image validation shared by the profile and report write paths
 * (signature spec §4.4). The browser sends a data URL — the canvas and the file
 * input both produce one — and the server decides whether it is an image before
 * a byte reaches storage. The stored pixels are exactly what the user approved;
 * nothing is re-encoded here.
 */
export interface SignatureBytes {
  bytes: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg';
  extension: 'png' | 'jpg';
}

const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/;

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

/**
 * Returns the decoded image, or null when the value is not a PNG/JPEG data URL
 * within the size limit. The declared MIME must match the file signature, so a
 * renamed file is refused rather than stored as the wrong type.
 */
export function parseSignatureImage(value: string): SignatureBytes | null {
  const match = DATA_URL.exec(value.trim());
  if (!match) return null;

  const mimeType = match[1] as 'image/png' | 'image/jpeg';
  const base64 = match[2] ?? '';

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return null;
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.length === 0 || bytes.length > SIGNATURE_MAX_BYTES) return null;

  const png = mimeType === 'image/png' && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  const jpeg = mimeType === 'image/jpeg' && startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (!png && !jpeg) return null;

  return { bytes, mimeType, extension: mimeType === 'image/png' ? 'png' : 'jpg' };
}

/** Server-chosen key: the bucket never carries a user-provided name. */
export function profileSignatureKey(userId: string): string {
  return `signatures/${userId}/${crypto.randomUUID()}`;
}

/** The report keeps its own copy, so a later profile change cannot alter it. */
export function reportSignatureKey(reportId: string): string {
  return `reports/${reportId}/signature-${crypto.randomUUID()}`;
}

/** The approving officer's copy, taken when the record is approved. */
export function reportApprovalSignatureKey(reportId: string): string {
  return `reports/${reportId}/approval-signature-${crypto.randomUUID()}`;
}

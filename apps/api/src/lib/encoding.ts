/** Byte/string conversions shared by password hashing and token handling. */

const textEncoder = new TextEncoder();

export function encodeUtf8(value: string): Uint8Array {
  return textEncoder.encode(value);
}

export function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function toBinary(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
}

export function toBase64(bytes: Uint8Array): string {
  return btoa(toBinary(bytes));
}

export function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

/** URL-safe base64 without padding, for opaque tokens that travel in links. */
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

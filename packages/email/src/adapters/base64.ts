/**
 * Workers and Node both expose `btoa`; the chunk keeps the argument list sane
 * when an attached PDF runs to a few megabytes.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;

  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }

  return btoa(binary);
}

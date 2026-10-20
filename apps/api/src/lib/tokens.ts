import { encodeUtf8, toBase64Url, toHex } from './encoding';

/**
 * Opaque session and email tokens (spec §7.4). The plaintext is 32 random bytes
 * and leaves the Worker exactly once — in the cookie or the email link. Only
 * `hashToken`'s output is stored, so a database read cannot be replayed as a
 * live credential.
 */
const TOKEN_BYTES = 32;

export function createOpaqueToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

export async function hashToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encodeUtf8(token)));
}

/** `Authorization: Bearer <token>` → the token, or null for any other scheme. */
export function authorizationToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}

import type { AuthConfig } from '@par/shared';

import type { Env } from '../../../env';

/**
 * Addresses that become an active Admin as soon as they verify (owner decision).
 * Stored lowercase so the comparison against a normalized email is exact.
 */
export function parseBootstrapAdmins(raw: string | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isBootstrapAdmin(email: string, admins: readonly string[]): boolean {
  return admins.includes(email.trim().toLowerCase());
}

/** Google sign-in is offered only when both halves of the client are configured. */
export function googleConfigured(
  env: Pick<Env, 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'>,
): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function authConfig(env: Env): AuthConfig {
  return { googleEnabled: googleConfigured(env) };
}

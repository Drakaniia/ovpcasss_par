import type { Database } from '@par/db';
import { createIdempotencyQueries } from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../env';
import { encodeUtf8, toHex } from './encoding';

/**
 * Retried writes (spec §9): the client sends `idempotency-key` once per intent,
 * so a retry after a lost response replays the first answer instead of creating
 * a second record or a second submission. Keys are scoped by the caller.
 */
export function idempotencyKey(c: Context<AppEnv>): string | null {
  const value = c.req.header('idempotency-key')?.trim();
  return value ? value.slice(0, 128) : null;
}

/** A stable digest of the request, so one key cannot replay a different body. */
export async function requestFingerprint(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeUtf8(JSON.stringify(value)));
  return toHex(digest);
}

export interface StoredResponse {
  key: string;
  userId: string;
  requestHash: string;
  response: string;
}

/** The earlier answer for this key, or null when the request is new. */
export async function findStoredResponse(
  db: Database,
  key: string,
  userId: string,
): Promise<StoredResponse | null> {
  return createIdempotencyQueries(db).find(key, userId);
}

/** Records the answer so the same key can replay it; the first write wins. */
export async function storeResponse(
  db: Database,
  input: StoredResponse,
  now: string,
): Promise<void> {
  await createIdempotencyQueries(db).save({ ...input, now });
}

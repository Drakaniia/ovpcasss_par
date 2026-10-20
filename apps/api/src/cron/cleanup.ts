/**
 * Scheduled cleanup (spec §7.1, §7.8). Three kinds of junk accumulate on their
 * own and nothing else removes them:
 *
 * - expired sessions — a row that can never authenticate again,
 * - expired or long-used verify/reset tokens,
 * - presigned uploads the client never confirmed within a day.
 *
 * Fixed-window rate-limit rows are swept with them. The job only ever deletes
 * what it can prove is dead, so a failed run is retried by the next one.
 */

/** An upload that is still PENDING after this long is an orphan (spec §7.8). */
export const ORPHAN_UPLOAD_MS = 24 * 60 * 60 * 1000;

/** A spent link only needs to survive long enough to be explained in review. */
export const USED_TOKEN_MS = 24 * 60 * 60 * 1000;

/** Closed rate-limit windows cannot be counted again. */
export const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface CleanupQueries {
  sessions: { deleteExpired(at: string): Promise<number> };
  tokens: { deleteExpiredOrUsed(now: string, usedBefore: string): Promise<number> };
  rateLimits: { deleteOlderThan(cutoff: string): Promise<number> };
  attachments: {
    listOrphanedPending(before: string): Promise<{ id: string; objectKey: string }[]>;
    softDelete(id: string, now: string): Promise<unknown>;
  };
}

export interface CleanupBucket {
  delete(key: string): Promise<void>;
}

export interface CleanupCounts {
  sessions: number;
  tokens: number;
  rateLimits: number;
  uploads: number;
}

function shift(now: Date, milliseconds: number): string {
  return new Date(now.getTime() - milliseconds).toISOString();
}

export async function runCleanup(
  sources: { queries: CleanupQueries; bucket: CleanupBucket },
  now: Date,
): Promise<CleanupCounts> {
  const at = now.toISOString();
  const { queries, bucket } = sources;

  const sessions = await queries.sessions.deleteExpired(at);
  const tokens = await queries.tokens.deleteExpiredOrUsed(at, shift(now, USED_TOKEN_MS));
  const rateLimits = await queries.rateLimits.deleteOlderThan(shift(now, RATE_WINDOW_MS));

  const orphans = await queries.attachments.listOrphanedPending(shift(now, ORPHAN_UPLOAD_MS));
  let uploads = 0;

  for (const orphan of orphans) {
    try {
      await bucket.delete(orphan.objectKey);
    } catch (error) {
      // Keep the row PENDING so the next run retries the object it left behind.
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Orphaned upload could not be removed',
          attachmentId: orphan.id,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
      continue;
    }

    await queries.attachments.softDelete(orphan.id, at);
    uploads += 1;
  }

  return { sessions, tokens, rateLimits, uploads };
}

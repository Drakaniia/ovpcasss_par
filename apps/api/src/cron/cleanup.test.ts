import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ORPHAN_UPLOAD_MS,
  RATE_WINDOW_MS,
  USED_TOKEN_MS,
  runCleanup,
  type CleanupQueries,
} from './cleanup';

const NOW = new Date('2026-10-19T10:00:00.000Z');

function shift(milliseconds: number): string {
  return new Date(NOW.getTime() - milliseconds).toISOString();
}

function sources(overrides: { deleteFails?: boolean } = {}) {
  const softDelete = vi.fn(async (_id: string, _now: string) => null);
  const queries = {
    sessions: { deleteExpired: vi.fn(async () => 3) },
    tokens: { deleteExpiredOrUsed: vi.fn(async () => 2) },
    rateLimits: { deleteOlderThan: vi.fn(async () => 4) },
    attachments: {
      listOrphanedPending: vi.fn(async () => [
        { id: 'att-1', objectKey: 'reports/r1/one' },
        { id: 'att-2', objectKey: 'reports/r1/two' },
      ]),
      softDelete,
    },
  } satisfies CleanupQueries;

  const bucket = {
    delete: overrides.deleteFails
      ? vi.fn(async () => {
          throw new Error('R2 is unavailable');
        })
      : vi.fn(async () => undefined),
  };

  return { queries, bucket, softDelete };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scheduled cleanup', () => {
  it('deletes only rows that can no longer be used', async () => {
    const { queries, bucket } = sources();

    await runCleanup({ queries, bucket }, NOW);

    expect(queries.sessions.deleteExpired).toHaveBeenCalledWith(NOW.toISOString());
    expect(queries.tokens.deleteExpiredOrUsed).toHaveBeenCalledWith(
      NOW.toISOString(),
      shift(USED_TOKEN_MS),
    );
    expect(queries.rateLimits.deleteOlderThan).toHaveBeenCalledWith(shift(RATE_WINDOW_MS));
    expect(queries.attachments.listOrphanedPending).toHaveBeenCalledWith(shift(ORPHAN_UPLOAD_MS));
  });

  it('removes the orphaned object before marking its row deleted', async () => {
    const { queries, bucket, softDelete } = sources();

    const counts = await runCleanup({ queries, bucket }, NOW);

    expect(bucket.delete.mock.calls).toEqual([['reports/r1/one'], ['reports/r1/two']]);
    expect(softDelete.mock.calls).toEqual([
      ['att-1', NOW.toISOString()],
      ['att-2', NOW.toISOString()],
    ]);
    expect(counts).toEqual({ sessions: 3, tokens: 2, rateLimits: 4, uploads: 2 });
  });

  it('keeps a row PENDING when its object could not be deleted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { queries, bucket, softDelete } = sources({ deleteFails: true });

    const counts = await runCleanup({ queries, bucket }, NOW);

    expect(counts.uploads).toBe(0);
    expect(softDelete).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

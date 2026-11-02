import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GC_TIME, STALE_TIME, cacheRead, invalidateReadCache, readCached } from './read-cache';

let now = 0;

beforeEach(() => {
  invalidateReadCache();
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
  invalidateReadCache();
});

describe('read cache', () => {
  it('serves the stored answer instead of loading it again', async () => {
    const loader = vi.fn(async () => ({ items: [1, 2] }));

    const first = await cacheRead('GET /reports', loader);
    const second = await cacheRead('GET /reports', loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('keeps different reads apart', async () => {
    const first = vi.fn(async () => 'register');
    const second = vi.fn(async () => 'record');

    await cacheRead('GET /reports', first);
    expect(await cacheRead('GET /reports/1', second)).toBe('record');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('shares one request between callers asking at the same time', async () => {
    const loader = vi.fn(async () => 'campuses');

    const [first, second] = await Promise.all([
      cacheRead('GET /ref/campuses', loader),
      cacheRead('GET /ref/campuses', loader),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(first).toBe('campuses');
    expect(second).toBe('campuses');
  });

  it('stores nothing when the read failed', async () => {
    const loader = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(cacheRead('GET /me', loader)).rejects.toThrow('offline');

    expect(readCached('GET /me')).toBeUndefined();
    expect(await cacheRead('GET /me', async () => 'account')).toBe('account');
  });

  it('hands over a stale answer at once and refreshes it for the next visit', async () => {
    await cacheRead('GET /reports/1', async () => 'draft');

    now += STALE_TIME;
    const reload = vi.fn(async () => 'approved');

    expect(await cacheRead('GET /reports/1', reload)).toBe('draft');
    expect(reload).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => expect(readCached('GET /reports/1')?.value).toBe('approved'));
  });

  it('drops an answer nobody has read for the collection window', async () => {
    await cacheRead('GET /reports', async () => 'list');

    now += GC_TIME + 1;

    expect(readCached('GET /reports')).toBeUndefined();
  });

  it('forgets everything when a write invalidates it', async () => {
    await cacheRead('GET /me/inbox', async () => 'inbox');

    invalidateReadCache();

    expect(readCached('GET /me/inbox')).toBeUndefined();
  });

  it('does not let a read that started before a write repopulate the cache', async () => {
    let settle: (value: string) => void = () => undefined;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          settle = resolve;
        }),
    );

    const pending = cacheRead('GET /reports', loader);
    invalidateReadCache();
    settle('stale');

    expect(await pending).toBe('stale');
    expect(readCached('GET /reports')).toBeUndefined();
  });
});

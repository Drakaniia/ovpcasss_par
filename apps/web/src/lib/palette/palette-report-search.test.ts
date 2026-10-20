import type { ReportListResponse } from '@par/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/client', () => ({
  api: { reports: { list: vi.fn() } },
}));

import { api } from '$lib/api/client';

import { PaletteReportSearch } from './palette-report-search.svelte';

const list = vi.mocked(api.reports.list);
const DEBOUNCE_MS = 200;

const response = (title: string): ReportListResponse => ({
  items: [
    {
      id: 'r1',
      ownerUserId: 'u1',
      trackingNumber: 'OFF-2026-0001',
      title,
      type: 'OFF_CAMPUS',
      status: 'SUBMITTED',
      activityStartDate: '2026-03-12',
      activityEndDate: '2026-03-13',
      updatedAt: '2026-03-14T01:12:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  size: 25,
  facets: { campuses: [], terms: [] },
});

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('PaletteReportSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    list.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never searches for a one-character query', async () => {
    const search = new PaletteReportSearch();
    search.search('c');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(list).not.toHaveBeenCalled();
    expect(search.reports).toEqual([]);
    expect(search.loading).toBe(false);
  });

  it('debounces a burst of typing into one request', async () => {
    list.mockResolvedValue(response('Coastal cleanup'));

    const search = new PaletteReportSearch();
    search.search('co');
    search.search('coa');
    search.search('coas');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ q: 'coas', page: 1 }));
    expect(search.reports.map((report) => report.title)).toEqual(['Coastal cleanup']);
    expect(search.loading).toBe(false);
  });

  it('ignores a response from a superseded query', async () => {
    const pending = new Map<string, (value: ReportListResponse) => void>();
    list.mockImplementation(
      (query) =>
        new Promise<ReportListResponse>((resolve) => pending.set(String(query.q), resolve)),
    );

    const search = new PaletteReportSearch();
    search.search('coa');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    search.search('coastal');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    pending.get('coa')?.(response('Stale title'));
    await settle();

    expect(search.reports).toEqual([]);
    expect(search.loading).toBe(true);

    pending.get('coastal')?.(response('Coastal cleanup'));
    await settle();

    expect(search.reports.map((report) => report.title)).toEqual(['Coastal cleanup']);
    expect(search.loading).toBe(false);
  });

  it('keeps the failure in one line and retries the same query', async () => {
    list.mockRejectedValueOnce(new Error('offline'));

    const search = new PaletteReportSearch();
    search.search('coastal');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(search.failed).toBe(true);
    expect(search.reports).toEqual([]);

    list.mockResolvedValueOnce(response('Coastal cleanup'));
    search.retry();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(search.failed).toBe(false);
    expect(search.reports).toHaveLength(1);
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'coastal' }));
  });

  it('drops every previous result on reset', async () => {
    list.mockResolvedValue(response('Coastal cleanup'));

    const search = new PaletteReportSearch();
    search.search('coastal');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();
    expect(search.reports).toHaveLength(1);

    search.reset();
    expect(search.reports).toEqual([]);
    expect(search.loading).toBe(false);
  });
});

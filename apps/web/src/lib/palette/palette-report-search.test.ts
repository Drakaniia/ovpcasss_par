import type { ReportSearchResponse } from '@par/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/client', () => ({
  api: { reports: { search: vi.fn() } },
}));

import { api } from '$lib/api/client';

import { PaletteReportSearch } from './palette-report-search.svelte';

const search = vi.mocked(api.reports.search);
const DEBOUNCE_MS = 200;

const response = (title: string): ReportSearchResponse => ({
  items: [
    {
      id: 'r1',
      ownerUserId: 'u1',
      trackingNumber: 'OFF-2026-0001',
      title,
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      status: 'SUBMITTED',
      activityStartDate: '2026-03-12',
      activityEndDate: '2026-03-13',
      updatedAt: '2026-03-14T01:12:00.000Z',
      ownerName: 'M. Santos',
      unitName: 'College of Arts and Sciences',
    },
  ],
});

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('PaletteReportSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    search.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the recent group on open without waiting for typing', async () => {
    search.mockResolvedValue(response('Coastal cleanup'));

    const reports = new PaletteReportSearch();
    reports.loadRecent();
    await settle();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ limit: 5 });
    expect(reports.recent).toBe(true);
    expect(reports.reports.map((report) => report.title)).toEqual(['Coastal cleanup']);
  });

  it('never searches for a one-character query', async () => {
    const reports = new PaletteReportSearch();
    reports.search('c');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(search).not.toHaveBeenCalled();
    expect(reports.reports).toEqual([]);
    expect(reports.recent).toBe(false);
    expect(reports.loading).toBe(false);
  });

  it('debounces a burst of typing into one request', async () => {
    search.mockResolvedValue(response('Coastal cleanup'));

    const reports = new PaletteReportSearch();
    reports.search('co');
    reports.search('coa');
    reports.search('coas');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ q: 'coas', limit: 8 });
    expect(reports.recent).toBe(false);
    expect(reports.reports.map((report) => report.title)).toEqual(['Coastal cleanup']);
    expect(reports.loading).toBe(false);
  });

  it('drops the previous rows as soon as the query changes', async () => {
    search.mockResolvedValue(response('Coastal cleanup'));

    const reports = new PaletteReportSearch();
    reports.loadRecent();
    await settle();
    expect(reports.reports).toHaveLength(1);

    reports.search('river');

    // Nothing stale is selectable while the new request is in flight.
    expect(reports.reports).toEqual([]);
    expect(reports.loading).toBe(true);

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();
    expect(reports.reports).toHaveLength(1);
  });

  it('ignores a response from a superseded query', async () => {
    const pending = new Map<string, (value: ReportSearchResponse) => void>();
    search.mockImplementation(
      (query) =>
        new Promise<ReportSearchResponse>((resolve) => pending.set(String(query.q), resolve)),
    );

    const reports = new PaletteReportSearch();
    reports.search('coa');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    reports.search('coastal');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    pending.get('coa')?.(response('Stale title'));
    await settle();

    expect(reports.reports).toEqual([]);
    expect(reports.loading).toBe(true);

    pending.get('coastal')?.(response('Coastal cleanup'));
    await settle();

    expect(reports.reports.map((report) => report.title)).toEqual(['Coastal cleanup']);
    expect(reports.loading).toBe(false);
  });

  it('keeps the failure in one line and retries the same query', async () => {
    search.mockRejectedValueOnce(new Error('offline'));

    const reports = new PaletteReportSearch();
    reports.search('coastal');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(reports.failed).toBe(true);
    expect(reports.reports).toEqual([]);

    search.mockResolvedValueOnce(response('Coastal cleanup'));
    reports.retry();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(reports.failed).toBe(false);
    expect(reports.reports).toHaveLength(1);
    expect(search).toHaveBeenLastCalledWith({ q: 'coastal', limit: 8 });
  });

  it('returns to the recent group when the query is cleared', async () => {
    search.mockResolvedValue(response('Coastal cleanup'));

    const reports = new PaletteReportSearch();
    reports.search('coastal');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    reports.search('');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await settle();

    expect(search).toHaveBeenLastCalledWith({ limit: 5 });
    expect(reports.recent).toBe(true);
  });

  it('drops every previous result on reset', async () => {
    search.mockResolvedValue(response('Coastal cleanup'));

    const reports = new PaletteReportSearch();
    reports.loadRecent();
    await settle();
    expect(reports.reports).toHaveLength(1);

    reports.reset();
    expect(reports.reports).toEqual([]);
    expect(reports.recent).toBe(false);
    expect(reports.loading).toBe(false);
  });
});

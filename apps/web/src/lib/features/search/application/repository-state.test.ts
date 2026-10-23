import type { ReportDetail } from '@par/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/client', () => ({ api: { reports: { get: mocks.get } } }));

import { RepositoryState } from './repository-state.svelte';

describe('RepositoryState selection', () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it('selecting a row opens its preview', async () => {
    const detail = { id: 'r1', title: 'Coastal cleanup' } as unknown as ReportDetail;
    mocks.get.mockResolvedValue(detail);
    const state = new RepositoryState();

    await state.select('r1');

    expect(state.selectedId).toBe('r1');
    expect(state.preview).toEqual({ loading: false, detail, notFound: false, error: null });
  });

  it('a report removed or made unreadable shows the shared not-found state', async () => {
    mocks.get.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Report not found'));
    const state = new RepositoryState();

    await state.select('gone');

    expect(state.selectedId).toBe('gone');
    expect(state.preview.notFound).toBe(true);
    expect(state.preview.error).toBeNull();
  });

  it('a report outside the current results is marked without a request', () => {
    const state = new RepositoryState();

    state.markNotFound('elsewhere');

    expect(state.selectedId).toBe('elsewhere');
    expect(state.preview.notFound).toBe(true);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('closing clears the selection and the preview', async () => {
    mocks.get.mockResolvedValue({ id: 'r1' } as unknown as ReportDetail);
    const state = new RepositoryState();
    await state.select('r1');

    state.clearSelection();

    expect(state.selectedId).toBeNull();
    expect(state.preview).toEqual({ loading: false, detail: null, notFound: false, error: null });
  });
});

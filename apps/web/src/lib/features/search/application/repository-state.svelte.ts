import type { ReportDetail, RepositoryFacets, RepositoryItem, RepositoryQuery } from '@par/shared';
import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { canSearchRepository } from '$lib/navigation/navigation';
import { loadSession } from '$lib/session/session.svelte';

import { SEARCH_TIMEOUT_CODES, SEARCH_TIMEOUT_COPY } from './repository-rows';

/**
 * Repository page state (UI spec §7.11). The URL owns the query, the filters,
 * and the open report; this module owns the results, the preview pane, and the
 * states that are not URL state (loading, failure).
 */
export type RepositoryView = 'loading' | 'ready' | 'denied' | 'error';

export type RepositoryPreview = {
  loading: boolean;
  detail: ReportDetail | null;
  /** The report was removed, or access to it changed, after the results loaded. */
  notFound: boolean;
  error: string | null;
};

export type RepositoryNotice = {
  title: string;
  description: string;
  requestId?: string;
};

function emptyPreview(): RepositoryPreview {
  return { loading: false, detail: null, notFound: false, error: null };
}

/** A search that timed out keeps the previous results instead of showing a lie. */
function isTimeout(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 408 || error.status === 504 || SEARCH_TIMEOUT_CODES.has(error.code);
}

/** The last page may have emptied under a new scope; clamp instead of lying. */
function fallbackPage(total: number, size: number, page: number): number {
  const last = Math.max(1, Math.ceil(total / size));
  return Math.min(page, last);
}

export class RepositoryState {
  view = $state<RepositoryView>('loading');
  items = $state<RepositoryItem[]>([]);
  total = $state(0);
  facets = $state<RepositoryFacets | null>(null);
  requestId = $state<string | undefined>(undefined);
  /** The list request failed; the search box and the filters stay on screen. */
  loadFailed = $state(false);
  loading = $state(true);
  /** A timeout or too-large scope: the last results stay, with an inline notice. */
  notice = $state<RepositoryNotice | null>(null);
  selectedId = $state<string | null>(null);
  /** The first successful page has arrived, so URL selection can be resolved. */
  loaded = $state(false);
  /** Screen-reader line for changes the user did not trigger directly. */
  announcement = $state('');
  preview = $state<RepositoryPreview>(emptyPreview());

  private hasLoaded = false;
  private previewToken = 0;

  /** Signed in, active, and holding a role the repository admits. */
  async load() {
    this.view = 'loading';
    this.requestId = undefined;

    try {
      const user = await loadSession();
      if (!user) {
        await goto('/login', { replaceState: true });
        return;
      }
      if (!canSearchRepository(user.role)) {
        this.view = 'denied';
        return;
      }
      this.view = 'ready';
    } catch (error) {
      this.view = 'error';
      this.requestId = error instanceof ApiError ? error.requestId : undefined;
    }
  }

  /** Runs the search; returns a page to fall back to when the scope shrank. */
  async reload(query: RepositoryQuery): Promise<number | null> {
    if (!this.hasLoaded) this.loading = true;
    this.requestId = undefined;
    this.loadFailed = false;

    try {
      const response = await api.search.repository(query);

      const target = fallbackPage(response.total, response.size, query.page);
      if (target !== query.page) return target;

      this.items = response.items;
      this.total = response.total;
      this.facets = response.facets;
      this.notice = null;
      this.hasLoaded = true;
      this.loaded = true;
      this.keepSelection();
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await goto('/login', { replaceState: true });
        return null;
      }

      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return null;
      }

      if (isTimeout(error)) {
        this.requestId = error instanceof ApiError ? error.requestId : undefined;
        this.notice = { ...SEARCH_TIMEOUT_COPY, requestId: this.requestId };
        return null;
      }

      this.requestId = error instanceof ApiError ? error.requestId : undefined;
      this.loadFailed = true;
      return null;
    } finally {
      this.loading = false;
    }
  }

  dismissNotice() {
    this.notice = null;
  }

  private keepSelection() {
    if (!this.selectedId) return;
    if (this.items.some((item) => item.id === this.selectedId)) return;

    this.selectedId = null;
    this.preview = emptyPreview();
    this.announcement =
      'The selected report is no longer in these results. The preview was cleared.';
  }

  async select(id: string) {
    if (this.selectedId === id && this.preview.detail) return;
    await this.openPreview(id);
  }

  /** Retry for the pane's own failure: the selection stays where it is. */
  async reloadPreview() {
    if (!this.selectedId) return;
    await this.openPreview(this.selectedId);
  }

  private async openPreview(id: string) {
    this.selectedId = id;
    const token = ++this.previewToken;
    this.preview = { loading: true, detail: null, notFound: false, error: null };

    try {
      const detail = await api.reports.get(id);

      if (token !== this.previewToken) return;
      this.preview = { loading: false, detail, notFound: false, error: null };
    } catch (error) {
      if (token !== this.previewToken) return;

      // Access revoked between the results and opening the report: the shared
      // 404 copy, so the page never leaks whether the report exists.
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        this.preview = { loading: false, detail: null, notFound: true, error: null };
        return;
      }

      this.preview = {
        loading: false,
        detail: null,
        notFound: false,
        error: error instanceof ApiError ? error.message : 'The report summary did not load.',
      };
    }
  }

  /** A report named in the URL but absent from the current results. */
  markNotFound(id: string) {
    this.previewToken += 1;
    this.selectedId = id;
    this.preview = { loading: false, detail: null, notFound: true, error: null };
  }

  clearSelection() {
    this.previewToken += 1;
    this.selectedId = null;
    this.preview = emptyPreview();
  }
}

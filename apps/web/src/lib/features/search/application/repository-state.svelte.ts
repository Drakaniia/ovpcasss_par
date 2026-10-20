import type {
  Campus,
  ReportDetail,
  RepositoryFacets,
  RepositoryItem,
  RepositoryQuery,
  Sdg,
  Unit,
} from '@par/shared';
import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import type { FacsimileReferences } from '$lib/features/facsimile/application/facsimile-document';
import { ensureActiveSession } from '$lib/features/reports/application/edit-returned-requests';
import { fallbackPage } from '$lib/features/reports/application/report-list';
import { canSearchRepository } from '$lib/navigation/navigation';
import { clearSession, session } from '$lib/session/session.svelte';

import { SEARCH_TIMEOUT_CODES, SEARCH_TIMEOUT_COPY } from './repository-rows';

/**
 * Repository page state (UI spec §7.11). The URL owns the query and every
 * filter; this module owns the role gate, the results, the preview pane, and the
 * states that are not URL state (loading, failure, access revoked).
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

function emptyReferences(): FacsimileReferences {
  return { campuses: [], units: [], sdgs: [] };
}

/** A search that timed out keeps the previous results instead of showing a lie. */
function isTimeout(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 408 || error.status === 504 || SEARCH_TIMEOUT_CODES.has(error.code);
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
  /** Screen-reader line for changes the user did not trigger directly. */
  announcement = $state('');
  preview = $state<RepositoryPreview>(emptyPreview());
  references = $state<FacsimileReferences>(emptyReferences());

  private hasLoaded = false;
  private referencesLoaded = false;
  private previewToken = 0;

  /** Signed in, active, and holding a role the repository admits. */
  async load() {
    this.view = 'loading';
    this.requestId = undefined;

    const gate = await ensureActiveSession();
    if (gate !== 'ok') {
      if (gate === 'error') this.view = 'error';
      return;
    }

    if (!canSearchRepository(session.user?.role)) {
      this.view = 'denied';
      return;
    }

    this.view = 'ready';
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
      this.keepSelection();
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
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
    if (this.selectedId === id) return;
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
      await this.loadReferences();
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

  clearSelection() {
    this.previewToken += 1;
    this.selectedId = null;
    this.preview = emptyPreview();
  }

  private async loadReferences(): Promise<FacsimileReferences> {
    if (this.referencesLoaded) return this.references;

    const [campuses, units, sdgs] = await Promise.all([
      api.reference.list('campuses'),
      api.reference.list('units'),
      api.reference.list('sdgs'),
    ]);

    this.references = {
      campuses: campuses.items as Campus[],
      units: units.items as Unit[],
      sdgs: sdgs.items as Sdg[],
    };
    this.referencesLoaded = true;
    return this.references;
  }
}

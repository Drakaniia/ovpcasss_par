import { actsAs } from '@par/shared';
import type {
  Campus,
  QueueFacets,
  QueueItem,
  QueueKind,
  QueueListQuery,
  ReportDetail,
  Role,
  Sdg,
  Unit,
} from '@par/shared';
import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import type { FacsimileReferences } from '$lib/features/facsimile/application/facsimile-document';
import { fallbackPage } from '$lib/features/reports/application/report-list';
import { ensureActiveSession } from '$lib/features/reports/application/edit-returned-requests';
import { clearSession, session } from '$lib/session/session.svelte';

/**
 * Queue page state (UI spec §7.9). The list, the master–detail selection, and the
 * preview document live here; the URL owns the filters and the components own
 * their rendering.
 */
export type QueueView = 'loading' | 'ready' | 'denied' | 'error';

const REQUIRED_ROLE: Record<QueueKind, Role> = {
  review: 'REVIEWER',
  approval: 'APPROVER',
};

/** A decided row fades out before it leaves the backlog. */
const LEAVE_MS = 160;

export type QueuePreview = {
  loading: boolean;
  detail: ReportDetail | null;
  error: string | null;
};

function emptyPreview(): QueuePreview {
  return { loading: false, detail: null, error: null };
}

function emptyReferences(): FacsimileReferences {
  return { campuses: [], units: [], sdgs: [] };
}

function listQueue(kind: QueueKind, query: QueueListQuery) {
  return kind === 'review' ? api.queues.review(query) : api.queues.approval(query);
}

export class QueueState {
  view = $state<QueueView>('loading');
  items = $state<QueueItem[]>([]);
  total = $state(0);
  oldestAgeDays = $state(0);
  facets = $state<QueueFacets | null>(null);
  requestId = $state<string | undefined>(undefined);
  /** The list request failed; the filters and the header stay on screen. */
  loadFailed = $state(false);
  loading = $state(true);
  selectedId = $state<string | null>(null);
  leavingId = $state<string | null>(null);
  /** Screen-reader line for changes the user did not trigger directly. */
  announcement = $state('');
  preview = $state<QueuePreview>(emptyPreview());
  references = $state<FacsimileReferences>(emptyReferences());

  private readonly kind: QueueKind;
  private hasLoaded = false;
  private referencesLoaded = false;
  private previewToken = 0;
  private leaveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(kind: QueueKind) {
    this.kind = kind;
  }

  get requiredRole(): Role {
    return REQUIRED_ROLE[this.kind];
  }

  /** Signed in, active, and holding the role this queue belongs to. */
  async load() {
    this.view = 'loading';
    this.requestId = undefined;

    const gate = await ensureActiveSession();
    if (gate !== 'ok') {
      if (gate === 'error') this.view = 'error';
      return;
    }

    if (!actsAs(session.user?.role, this.requiredRole)) {
      this.view = 'denied';
      return;
    }

    this.view = 'ready';
  }

  /** Reloads the page; returns a page to fall back to when the filters emptied it. */
  async reload(query: QueueListQuery): Promise<number | null> {
    if (!this.hasLoaded) this.loading = true;
    this.requestId = undefined;
    this.loadFailed = false;

    try {
      const response = await listQueue(this.kind, query);

      const target = fallbackPage(response.total, response.size, query.page);
      if (target !== query.page) return target;

      this.items = response.items;
      this.total = response.total;
      this.oldestAgeDays = response.oldestAgeDays;
      this.facets = response.facets;
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

      this.requestId = error instanceof ApiError ? error.requestId : undefined;
      this.loadFailed = true;
      return null;
    } finally {
      this.loading = false;
    }
  }

  /** A refresh keeps the open preview when its row still exists (UI spec §7.9). */
  private keepSelection() {
    if (!this.selectedId) return;
    if (this.items.some((item) => item.id === this.selectedId)) return;

    this.selectedId = null;
    this.preview = emptyPreview();
    this.announcement = 'The selected report is no longer in this queue. The preview was cleared.';
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
    this.preview = { loading: true, detail: null, error: null };

    try {
      await this.loadReferences();
      const detail = await api.reports.get(id);

      if (token !== this.previewToken) return;
      this.preview = { loading: false, detail, error: null };
    } catch (error) {
      if (token !== this.previewToken) return;
      this.preview = {
        loading: false,
        detail: null,
        error: error instanceof ApiError ? error.message : 'The report did not load. Try again.',
      };
    }
  }

  clearSelection() {
    this.previewToken += 1;
    this.selectedId = null;
    this.preview = emptyPreview();
  }

  /**
   * Removes the decided row once the API confirmed the transition, clears the
   * pane, and returns the row that should take focus.
   */
  rowDecided(id: string): string | null {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const neighbour = this.items[index + 1] ?? this.items[index - 1] ?? null;

    this.leavingId = id;
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => {
      this.items = this.items.filter((item) => item.id !== id);
      this.total = Math.max(0, this.total - 1);
      this.leavingId = null;
    }, LEAVE_MS);

    if (this.selectedId === id) {
      this.previewToken += 1;
      this.selectedId = null;
      this.preview = emptyPreview();
      this.announcement = 'Report decided. It is no longer in this queue.';
    }

    return neighbour?.id ?? null;
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

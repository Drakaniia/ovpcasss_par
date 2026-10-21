import { api } from '$lib/api/client';
import {
  paletteReports,
  PALETTE_MIN_REPORT_QUERY,
  type PaletteReport,
} from '$lib/palette/palette-entries';

/** Reports are searched only after a short pause in typing (phase 12 §4). */
const DEBOUNCE_MS = 200;
/** Typing asks for more rows than the recent group does. */
const SEARCH_LIMIT = 8;
const RECENT_LIMIT = 5;

/**
 * The palette's report half. Pages are filtered synchronously from the registry
 * of destinations, so this class never blocks them: it owns the debounced
 * request, its loading row, its failure line, and the last response.
 *
 * An empty query is the recent group: the reports the viewer touched last, so
 * the palette opens with documents rather than only navigation. Clearing the
 * field brings that group back instead of leaving a stale result list.
 */
export class PaletteReportSearch {
  reports = $state<PaletteReport[]>([]);
  loading = $state(false);
  failed = $state(false);
  /** True while the list is the recent group, which has no match reason. */
  recent = $state(false);

  private token = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastQuery = '';

  /** Called when the palette opens: documents before the first keystroke. */
  loadRecent(): void {
    this.lastQuery = '';
    this.run('', RECENT_LIMIT, true);
  }

  search(query: string): void {
    const term = query.trim();
    this.lastQuery = term;

    // One character would match most of the register; wait for a real term.
    if (term.length > 0 && term.length < PALETTE_MIN_REPORT_QUERY) {
      this.token += 1;
      this.clearTimer();
      this.reports = [];
      this.recent = false;
      this.loading = false;
      this.failed = false;
      return;
    }

    // Clear before the request: a stale row must never be what Enter opens.
    this.recent = false;
    this.reports = [];
    this.run(term, term ? SEARCH_LIMIT : RECENT_LIMIT, false);
  }

  retry(): void {
    const term = this.lastQuery.trim();
    this.run(term, term ? SEARCH_LIMIT : RECENT_LIMIT, false);
  }

  /** Called on open and on close: a superseded request can never land. */
  reset(): void {
    this.token += 1;
    this.clearTimer();
    this.lastQuery = '';
    this.reports = [];
    this.recent = false;
    this.loading = false;
    this.failed = false;
  }

  private clearTimer(): void {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private run(term: string, limit: number, immediate: boolean): void {
    const token = (this.token += 1);
    this.clearTimer();
    this.loading = true;
    this.failed = false;

    const execute = () => void this.fetch(term, limit, token);
    if (immediate) execute();
    else this.timer = setTimeout(execute, DEBOUNCE_MS);
  }

  private async fetch(term: string, limit: number, token: number): Promise<void> {
    try {
      const response = await api.reports.search({ ...(term ? { q: term } : {}), limit });

      if (token !== this.token) return;
      this.reports = paletteReports(response.items);
      this.recent = term === '';
      this.failed = false;
    } catch {
      if (token !== this.token) return;
      this.reports = [];
      this.failed = true;
    } finally {
      if (token === this.token) this.loading = false;
    }
  }
}

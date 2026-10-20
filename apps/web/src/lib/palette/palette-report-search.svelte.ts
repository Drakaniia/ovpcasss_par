import { api } from '$lib/api/client';
import {
  paletteReports,
  PALETTE_MIN_REPORT_QUERY,
  type PaletteReport,
} from '$lib/palette/palette-entries';

/** Reports are searched only after a short pause in typing (phase 12 §4). */
const DEBOUNCE_MS = 200;

/**
 * The palette's report half. Pages are filtered synchronously from the registry
 * of destinations, so this class never blocks them: it only owns the debounced
 * request, its loading row, its failure line, and the last response.
 */
export class PaletteReportSearch {
  reports = $state<PaletteReport[]>([]);
  loading = $state(false);
  failed = $state(false);

  private token = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastQuery = '';

  search(query: string): void {
    this.lastQuery = query;
    const token = (this.token += 1);
    this.clearTimer();

    if (query.trim().length < PALETTE_MIN_REPORT_QUERY) {
      this.reports = [];
      this.loading = false;
      this.failed = false;
      return;
    }

    this.loading = true;
    this.failed = false;
    this.timer = setTimeout(() => void this.fetch(query, token), DEBOUNCE_MS);
  }

  retry(): void {
    if (this.lastQuery.trim().length < PALETTE_MIN_REPORT_QUERY) return;
    this.search(this.lastQuery);
  }

  /** Called on open and on close: a superseded request can never land. */
  reset(): void {
    this.token += 1;
    this.clearTimer();
    this.lastQuery = '';
    this.reports = [];
    this.loading = false;
    this.failed = false;
  }

  private clearTimer(): void {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async fetch(query: string, token: number): Promise<void> {
    try {
      const response = await api.reports.list({
        tab: 'all',
        q: query,
        sort: 'updated',
        dir: 'desc',
        page: 1,
        size: 25,
      });

      if (token !== this.token) return;
      this.reports = paletteReports(response.items);
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

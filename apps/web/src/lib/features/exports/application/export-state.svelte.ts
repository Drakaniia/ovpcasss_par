import type {
  MonitoringExportRequest,
  MonitoringPreviewResponse,
  ReportType,
  Term,
} from '@par/shared';
import { REPORT_TYPES } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError, saveBlob } from '$lib/api/http';
import { createPlatform } from '$lib/platform';
import { loadSession, session } from '$lib/session/session.svelte';
import { toast, type ToastOptions } from '$lib/toast/toast.svelte';

/**
 * Monitoring export page state (UI phase 14). The term, the sheet, and the
 * preview live here; the component owns rendering and the debounce.
 *
 * One request shape is derived from the fields so the preview and the download
 * can never disagree about which sheet is being exported.
 */
export type ExportView = 'loading' | 'ready' | 'denied' | 'error';
export type DownloadError = { message: string; requestId?: string };

function canExport(role: string | undefined): boolean {
  return role === 'REVIEWER' || role === 'APPROVER' || role === 'ADMIN';
}

/** Only reads, so both `URLSearchParams` and SvelteKit's read-only view fit. */
export type QueryReader = { get(name: string): string | null };

function typeFromUrl(params: QueryReader): ReportType {
  const value = params.get('type');
  return REPORT_TYPES.some((candidate) => candidate === value)
    ? (value as ReportType)
    : 'OFF_CAMPUS';
}

function semesterLabel(value: 1 | 2): string {
  return value === 1 ? '1st Semester' : '2nd Semester';
}

/**
 * The browser cannot open its download folder, so the toast action is a
 * desktop-only affordance (phase 14 §4, revised).
 */
async function revealAction(): Promise<ToastOptions | undefined> {
  const platform = await createPlatform().catch(() => null);
  if (platform?.shell !== 'desktop') return undefined;

  return {
    action: { label: 'Open folder', run: () => void platform.downloads.reveal() },
  };
}

export class ExportState {
  view = $state<ExportView>('loading');
  terms = $state<Term[]>([]);
  activeType = $state<ReportType>('OFF_CAMPUS');
  schoolYear = $state('');
  semester = $state<1 | 2>(1);
  includeInProgress = $state(false);
  preview = $state<MonitoringPreviewResponse | null>(null);
  previewLoading = $state(true);
  previewError = $state<string | null>(null);
  downloading = $state(false);
  downloadError = $state<DownloadError | null>(null);
  templateError = $state<string | null>(null);
  /** The review modal that stands between the form and the download. */
  previewOpen = $state(false);

  usableTerms = $derived(
    this.terms.filter((term) => term.semester === 1 || term.semester === 2),
  );
  hasTerms = $derived(this.usableTerms.length > 0);
  schoolYears = $derived(
    this.usableTerms
      .map((term) => term.schoolYear)
      .filter((year, index, all) => all.indexOf(year) === index)
      .sort((left, right) => right.localeCompare(left)),
  );
  semesterOptions = $derived(
    this.usableTerms
      .filter((term) => term.schoolYear === this.schoolYear)
      .map((term) => ({
        value: term.semester as 1 | 2,
        label: term.semester === 1 ? '1st Semester' : '2nd Semester',
      }))
      .sort((left, right) => left.value - right.value),
  );
  activeTerm = $derived(
    this.usableTerms.find(
      (term) => term.schoolYear === this.schoolYear && term.semester === this.semester,
    ),
  );
  activeSheet = $derived(this.preview?.sheet ?? null);
  totalRows = $derived(this.activeSheet?.total ?? 0);
  inProgressCount = $derived(this.activeSheet?.inProgressCount ?? 0);
  canDownload = $derived(
    this.preview !== null && this.previewError === null && !this.previewLoading && this.totalRows > 0,
  );
  searchHref = $derived(
    `/search?type=${this.activeType}&status=APPROVED${this.activeTerm ? `&term=${this.activeTerm.id}` : ''}`,
  );

  /** The single request shape both the preview and the workbook use. */
  get request(): MonitoringExportRequest {
    return {
      type: this.activeType,
      schoolYear: this.schoolYear,
      semester: this.semester,
      includeInProgress: this.includeInProgress,
    };
  }

  get userRole(): string | undefined {
    return session.user?.role ?? undefined;
  }

  /** Session gate, role gate, and the term the URL asked for or the current one. */
  async load(params: QueryReader): Promise<void> {
    this.view = 'loading';
    this.activeType = typeFromUrl(params);

    try {
      await loadSession();
    } catch {
      this.view = 'error';
      return;
    }

    if (!canExport(this.userRole)) {
      this.view = 'denied';
      return;
    }

    try {
      const response = await api.reference.list('terms');
      this.terms = response.items;

      const requestedTerm = params.get('term');
      const requestedYear = params.get('schoolYear');
      const requestedSemester = Number(params.get('semester'));

      const requested =
        this.usableTerms.find((term) => term.id === requestedTerm) ??
        this.usableTerms.find(
          (term) =>
            term.schoolYear === requestedYear && term.semester === requestedSemester,
        );
      const current = requested ?? this.usableTerms.find((term) => term.isCurrent) ?? this.usableTerms[0];

      if (current) {
        this.schoolYear = current.schoolYear;
        this.semester = current.semester as 1 | 2;
      }

      this.view = 'ready';
    } catch {
      this.view = 'error';
    }
  }

  async loadPreview(request: MonitoringExportRequest = this.request): Promise<void> {
    this.previewLoading = true;
    this.previewError = null;

    try {
      this.preview = await api.exports.preview(request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return;
      }
      this.previewError =
        error instanceof ApiError ? error.message : 'The preview did not load. Try again.';
    } finally {
      this.previewLoading = false;
    }
  }

  /** Opens the review modal; the workbook is only written from inside it. */
  requestDownload(): void {
    if (!this.canDownload || this.downloading) return;
    this.previewOpen = true;
  }

  async download(): Promise<void> {
    if (this.downloading) return;

    this.downloading = true;
    this.downloadError = null;

    try {
      const blob = await api.exports.monitoring(this.request);
      const type = this.activeType.replaceAll('_', '-');
      const name = `OVPCASSS-Monitoring-${type}-SY${this.schoolYear}-S${this.semester}.xlsx`;
      saveBlob(blob, name);
      this.previewOpen = false;
      toast.success(`Monitoring sheet downloaded: ${name}`, await revealAction());
    } catch (error) {
      this.downloadError = {
        message:
          error instanceof ApiError ? error.message : 'The workbook did not download. Try again.',
        requestId: error instanceof ApiError ? error.requestId : undefined,
      };
    } finally {
      this.downloading = false;
    }
  }

  async downloadTemplate(): Promise<void> {
    this.templateError = null;

    try {
      saveBlob(await api.exports.template(), 'OVPCASSS-Monitoring-Template.xlsx');
    } catch (error) {
      this.templateError =
        error instanceof ApiError ? error.message : 'The template did not download. Try again.';
    }
  }

  semesterLabel = semesterLabel;
}

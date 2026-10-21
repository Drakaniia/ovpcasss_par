import { goto } from '$app/navigation';
import type {
  EmailDeliveryStatus,
  EmailKind,
  EmailLogQuery,
  EmailLogRow,
  EmailMessageResponse,
} from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { loadSession } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

export const EMAIL_LOG_PAGE_SIZE = 50;

export type EmailLogView = 'loading' | 'ready' | 'denied' | 'error';

/** `ALL` is a UI-only value: the API has no status for it. */
export interface EmailLogFilters {
  status: EmailDeliveryStatus | 'ALL';
  kind: EmailKind | 'ALL';
  to: string;
}

export type QueryReader = { get(name: string): string | null };

/**
 * Phase 17 §2: the log opens on Failed, because a log is opened to investigate.
 * `status=ALL` is written to the URL explicitly, so a shared link that shows
 * everything is not mistaken for the default view.
 */
export function filtersFromParams(params: QueryReader): EmailLogFilters {
  const status = params.get('status');
  const kind = params.get('kind');

  return {
    status:
      status === 'ALL' || status === null
        ? status === 'ALL'
          ? 'ALL'
          : 'FAILED'
        : (status as EmailDeliveryStatus),
    kind: (kind as EmailKind | null) ?? 'ALL',
    to: params.get('to') ?? '',
  };
}

export function filtersToQuery(filters: EmailLogFilters, page: number): EmailLogQuery {
  return {
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.kind === 'ALL' ? {} : { kind: filters.kind }),
    ...(filters.to.trim() ? { to: filters.to.trim() } : {}),
    page,
    size: EMAIL_LOG_PAGE_SIZE,
  };
}

export function filtersToParams(filters: EmailLogFilters, page = 1): string {
  const parts: string[] = [];
  const add = (key: string, value: string) => parts.push(`${key}=${encodeURIComponent(value)}`);

  if (filters.status !== 'FAILED') add('status', filters.status);
  if (filters.kind !== 'ALL') add('kind', filters.kind);
  if (filters.to.trim()) add('to', filters.to.trim());
  if (page > 1) add('page', String(page));

  return parts.join('&');
}

/** One line of the failure callout: the count, or an honest empty statement. */
export function failureHeadline(counts: { failed: number; suppressed: number }): string {
  if (counts.failed === 0) return 'No message is waiting to be re-sent.';
  return counts.failed === 1
    ? '1 message could not be delivered.'
    : `${counts.failed} messages could not be delivered.`;
}

export class EmailLogState {
  view = $state<EmailLogView>('loading');
  filters = $state<EmailLogFilters>({ status: 'FAILED', kind: 'ALL', to: '' });
  rows = $state<EmailLogRow[]>([]);
  total = $state(0);
  page = $state(1);
  counts = $state({ failed: 0, suppressed: 0 });
  resending = $state<string | null>(null);
  loadError = $state<string | null>(null);
  /** The row whose stored copy is open, and that copy (email spec §9.4). */
  messageTarget = $state<EmailLogRow | null>(null);
  message = $state<EmailMessageResponse | null>(null);
  messageLoading = $state(false);
  messageError = $state<string | null>(null);

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / EMAIL_LOG_PAGE_SIZE));
  }

  async load(search: QueryReader): Promise<void> {
    this.view = 'loading';
    this.filters = filtersFromParams(search);
    this.page = Math.max(1, Number(search.get('page') ?? 1));

    try {
      const account = await loadSession();
      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }
      if (account.role !== 'ADMIN') {
        this.view = 'denied';
        return;
      }
    } catch {
      this.view = 'error';
      return;
    }

    await this.fetch();
  }

  async fetch(): Promise<void> {
    this.loadError = null;

    try {
      const response = await api.admin.emails.list(filtersToQuery(this.filters, this.page));
      this.rows = response.items;
      this.total = response.total;
      this.counts = response.counts;
      this.view = 'ready';
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        this.view = 'denied';
        return;
      }
      this.loadError =
        error instanceof ApiError ? error.message : 'The email log did not load. Try again.';
      this.view = 'error';
    }
  }

  async apply(patch: Partial<EmailLogFilters>): Promise<void> {
    this.filters = { ...this.filters, ...patch };
    this.page = 1;
    await this.navigate();
  }

  async showAll(): Promise<void> {
    this.filters = { ...this.filters, status: 'ALL' };
    this.page = 1;
    await this.navigate();
  }

  async goToPage(page: number): Promise<void> {
    this.page = Math.min(this.pageCount, Math.max(1, page));
    await this.navigate();
  }

  async resend(row: EmailLogRow): Promise<void> {
    if (this.resending) return;

    this.resending = row.id;
    try {
      await api.admin.emails.resend(row.id);
      toast.success(`Message queued again for ${row.to}`);
      await this.fetch();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'The message could not be queued again. Try again.',
      );
    } finally {
      this.resending = null;
    }
  }

  /**
   * Reads the stored copy so the office can deliver its link by other means
   * while delivery is broken. Read-only: no queue job, no audit row.
   */
  async viewMessage(row: EmailLogRow): Promise<void> {
    this.messageTarget = row;
    this.message = null;
    this.messageError = null;
    this.messageLoading = true;

    try {
      this.message = await api.admin.emails.message(row.id);
    } catch (error) {
      this.messageError =
        error instanceof ApiError
          ? error.message
          : 'The stored message could not be read. Try again.';
    } finally {
      this.messageLoading = false;
    }
  }

  closeMessage(): void {
    this.messageTarget = null;
    this.message = null;
    this.messageError = null;
  }

  private async navigate(): Promise<void> {
    const search = filtersToParams(this.filters, this.page);
    await goto(`/admin/emails${search ? `?${search}` : ''}`, { replaceState: true });
    await this.fetch();
  }
}

<script lang="ts">
  import type {
    ReportDeleteReceiptPolicy,
    ReportListResponse,
    ReportSortField,
  } from '@par/shared';
  import { Download } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';
  import {
    clearedFilters,
    defaultDirectionFor,
    filtersEqual,
    filtersFromParams,
    filtersToParams,
    filtersToQuery,
    hasActiveFilters,
    updateFilters,
    type ReportFilters,
  } from '$lib/features/reports/application/report-filters';
  import { deletionMessage } from '$lib/features/reports/application/report-delete';
  import {
    emptyStateFor,
    registerRow,
    type RegisterRow,
  } from '$lib/features/reports/application/report-register';
  import ReportFilterBar from '$lib/features/reports/presentation/ReportFilterBar.svelte';
  import ReportTable from '$lib/features/reports/presentation/ReportTable.svelte';
  import ReportsPageHeader from '$lib/features/reports/presentation/ReportsPageHeader.svelte';
  import ReportsPagination from '$lib/features/reports/presentation/ReportsPagination.svelte';
  import { clearSession, loadSession, session } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  type AuthState = 'loading' | 'ready' | 'error';

  let auth = $state<AuthState>('loading');
  let filters = $state<ReportFilters>(
    untrack(() => filtersFromParams(new URLSearchParams(page.url.search))),
  );
  let list = $state<ReportListResponse | null>(null);
  let loading = $state(true);
  let failure = $state<{ requestId?: string } | null>(null);
  let now = $state(new Date());
  let pendingDelete = $state<RegisterRow | null>(null);
  /** A filed record was approved, so its issued receipts are the office's choice. */
  let receiptPolicy = $state<ReportDeleteReceiptPolicy>('keep');
  let confirmOpen = $state(false);
  let deleting = $state(false);
  let exporting = $state(false);
  let requestId = 0;
  let hasLoaded = false;
  /** The filter string this page wrote last, so its own URL never echoes back. */
  let writtenParams = untrack(() => filtersToParams(filters));

  const role = $derived(session.user?.role ?? null);
  const rows = $derived(list ? list.items.map((item) => registerRow(item, { role })) : []);
  const empty = $derived(
    emptyStateFor(filters.tab, {
      role,
      hasFilters: hasActiveFilters(filters),
      archived: filters.archived === 'archived',
    }),
  );

  async function loadAccount(): Promise<void> {
    try {
      const account = await loadSession();
      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }
      if (account.status !== 'ACTIVE') {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }
      // The register is the office's (2026-10-23); a personnel account reads its
      // own records from Home and has no register to open.
      if (account.role !== 'ADMIN') {
        await goto('/', { replaceState: true });
        return;
      }
      auth = 'ready';
    } catch {
      auth = 'error';
    }
  }

  async function loadReports(query: ReportFilters): Promise<void> {
    const token = ++requestId;
    if (!hasLoaded) loading = true;
    failure = null;

    try {
      const result = await api.reports.list(filtersToQuery(query));
      if (token !== requestId) return;

      const pages = Math.max(1, Math.ceil(result.total / result.size));
      if (query.page > pages) {
        applyFilters({ page: pages });
        return;
      }

      list = result;
      now = new Date();
      hasLoaded = true;
    } catch (error) {
      if (token !== requestId) return;

      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }

      failure = { requestId: error instanceof ApiError ? error.requestId : undefined };
    } finally {
      if (token === requestId) loading = false;
    }
  }

  /**
   * The list follows the filters: the URL is written for sharing and Back, but
   * navigating must never take the caret out of the field being typed in, so
   * the write keeps focus and does not scroll.
   */
  function applyFilters(patch: Partial<ReportFilters>): void {
    const next = updateFilters(filters, patch);
    if (filtersEqual(next, filters)) return;

    filters = next;
    const params = filtersToParams(next);
    writtenParams = params;
    void goto(`/reports?${params}`, { replace: true, reset: false }).catch(() => {});
  }

  function sortBy(field: ReportSortField): void {
    const dir =
      filters.sort === field
        ? filters.dir === 'asc'
          ? 'desc'
          : 'asc'
        : defaultDirectionFor(field);
    void applyFilters({ sort: field, dir });
  }

  async function downloadRegister(): Promise<void> {
    if (exporting) return;
    exporting = true;
    try {
      await api.exports.register(filtersToQuery(filters));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'The register PDF was not prepared. Try again.',
      );
    } finally {
      exporting = false;
    }
  }

  async function setArchived(row: RegisterRow, archived: boolean): Promise<void> {
    try {
      if (archived) await api.reports.archive(row.id);
      else await api.reports.unarchive(row.id);
      toast.success(archived ? 'Record archived.' : 'Record returned to the register.');
      await loadReports(filters);
    } catch {
      toast.error('That record was not filed. Try again.');
    }
  }

  async function resend(row: RegisterRow): Promise<void> {
    try {
      const result = await api.reports.resendInvitation(row.id);
      toast.success(
        `Assignment mailed to ${result.sentTo} ${result.sentTo === 1 ? 'person' : 'people'}.`,
      );
    } catch {
      toast.error('The invitation was not sent. Try again.');
    }
  }

  function askDelete(row: RegisterRow): void {
    pendingDelete = row;
    receiptPolicy = 'keep';
    confirmOpen = true;
  }

  async function confirmDelete(): Promise<void> {
    const row = pendingDelete;
    if (!row || deleting) return;

    deleting = true;
    try {
      const result = await api.reports.remove(row.id, row.archived ? receiptPolicy : undefined);
      toast.success(row.archived ? deletionMessage(result) : 'Record deleted.');
      await loadReports(filters);
    } catch {
      toast.error('The record was not deleted. Try again.');
    } finally {
      deleting = false;
      pendingDelete = null;
    }
  }

  onMount(() => {
    void loadAccount();
  });

  $effect(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(page.url.search));
    const incoming = filtersToParams(fromUrl);
    // Skip the URL this page just wrote; only Back, a link, or a pasted URL is
    // an outside change that should replace the filters.
    if (incoming === writtenParams) return;

    writtenParams = incoming;
    if (
      !filtersEqual(
        fromUrl,
        untrack(() => filters),
      )
    )
      filters = fromUrl;
  });

  $effect(() => {
    if (auth !== 'ready') return;
    void loadReports(filters);
  });
</script>

<svelte:head><title>Reports · OVPCASSS Paperless PAR</title></svelte:head>

{#if auth === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to home."
    onretry={() => void loadAccount()}
    backHref="/"
    backLabel="Back to home"
  />
{:else}
  <ReportsPageHeader {role} />

  {#if auth === 'ready'}
    <div class="register-tools">
      <button
        class="btn btn-outline btn-sm"
        type="button"
        disabled={exporting}
        onclick={() => void downloadRegister()}
      >
        <Download size={15} aria-hidden="true" />
        {exporting ? 'Preparing…' : 'Download register PDF'}
      </button>
    </div>
  {/if}

  <ReportFilterBar
    {filters}
    facets={list?.facets ?? null}
    onchange={(patch) => void applyFilters(patch)}
    onclear={() => void applyFilters(clearedFilters(filters))}
  />

  {#if failure}
    <div class="table-state">
      <ErrorState
        title="We could not load the register"
        description="The list did not load. Try again, or return to home."
        requestId={failure.requestId}
        onretry={() => {
          hasLoaded = false;
          void loadReports(filters);
        }}
        backHref="/"
        backLabel="Back to home"
      />
    </div>
  {:else if loading || !list}
    <SkeletonTable rows={8} widths={[12, 34, 18, 12, 12, 6]} />
  {:else if rows.length === 0}
    <div class="table-state">
      <EmptyState
        title={empty.title}
        description={empty.description}
        action={empty.action}
        actionVariant="outline"
      />
    </div>
  {:else}
    <ReportTable
      {rows}
      sort={filters.sort}
      dir={filters.dir}
      {role}
      {now}
      onsort={sortBy}
      onedit={(row) => void goto(`/reports/${row.id}/edit`)}
      ondelete={askDelete}
      onresend={(row) => void resend(row)}
      onarchive={(row) => void setArchived(row, true)}
      onunarchive={(row) => void setArchived(row, false)}
    />

    <ReportsPagination
      total={list.total}
      page={filters.page}
      pageSize={filters.pageSize}
      onpage={(next) => void applyFilters({ page: next })}
      onpagesize={(size) => void applyFilters({ pageSize: size })}
    />
  {/if}
{/if}

{#if confirmOpen && pendingDelete}
  <ConfirmDialog
    bind:open={confirmOpen}
    title="Delete {pendingDelete.referenceNo}?"
    description={pendingDelete.archived
      ? 'The record is removed permanently: the activity, its narrative, the attachments and their files, and the receipt records are all removed. Records numbered after it move down one so the register stays unbroken, and the next record takes the freed number. A number already printed on a mailed receipt is superseded. The deletion stays in the audit log.'
      : 'No narrative has been submitted, so the record can be deleted. A saved narrative draft is deleted with it. The AR No. is retired and never reused, and the deletion is recorded in the audit log.'}
    confirmLabel={deleting ? 'Deleting…' : 'Delete record'}
    tone="destructive"
    onconfirm={() => void confirmDelete()}
    oncancel={() => (pendingDelete = null)}
  >
    {#if pendingDelete.archived}
      <fieldset class="receipt-choice">
        <legend class="field-label">Acknowledgment receipts already issued</legend>
        <label class="radio-choice">
          <input type="radio" bind:group={receiptPolicy} value="keep" />
          Keep the PDFs in storage
        </label>
        <p class="field-hint">
          The copies mailed to the PICs stay in storage as the office copy. They are no longer
          listed in the app.
        </p>
        <label class="radio-choice">
          <input type="radio" bind:group={receiptPolicy} value="void" />
          Delete the PDFs
        </label>
        <p class="field-hint">The receipt PDFs are removed, and copies already with the PICs are void.</p>
      </fieldset>
    {/if}
  </ConfirmDialog>
{/if}

<style>
  .receipt-choice {
    border: 0;
    margin: 0;
    padding: 0;
  }

  .receipt-choice .field-label {
    padding: 0;
  }

  .radio-choice {
    align-items: center;
    display: flex;
    gap: 8px;
    font-size: 13px;
    margin-top: 8px;
  }

  .receipt-choice .field-hint {
    margin: 2px 0 0 24px;
  }

  .register-tools {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
  }

  .register-tools .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }
</style>

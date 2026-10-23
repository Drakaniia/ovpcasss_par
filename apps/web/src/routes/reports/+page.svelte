<script lang="ts">
  import type { ReportListResponse, ReportSortField } from '@par/shared';
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
  let confirmOpen = $state(false);
  let deleting = $state(false);
  let requestId = 0;
  let hasLoaded = false;

  const role = $derived(session.user?.role ?? null);
  const rows = $derived(list ? list.items.map((item) => registerRow(item, { role })) : []);
  const empty = $derived(
    emptyStateFor(filters.tab, { role, hasFilters: hasActiveFilters(filters) }),
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
        await applyFilters({ page: pages });
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

  async function applyFilters(patch: Partial<ReportFilters>): Promise<void> {
    const next = updateFilters(filters, patch);
    if (filtersEqual(next, filters)) return;

    filters = next;
    await goto(`/reports?${filtersToParams(next)}`, { replaceState: true });
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
    confirmOpen = true;
  }

  async function confirmDelete(): Promise<void> {
    const row = pendingDelete;
    if (!row || deleting) return;

    deleting = true;
    try {
      await api.reports.remove(row.id);
      toast.success('Draft deleted.');
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
    description="This draft has no submitted narrative. The AR No. is retired and never reused, and the deletion is recorded in the audit log."
    confirmLabel={deleting ? 'Deleting…' : 'Delete draft'}
    tone="destructive"
    onconfirm={() => void confirmDelete()}
    oncancel={() => (pendingDelete = null)}
  />
{/if}

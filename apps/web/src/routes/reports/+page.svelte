<script lang="ts">
  import type { ReportDraft, ReportListResponse } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import {
    activeChips,
    clearedFilters,
    deleteDraftConfirmation,
    emptyStateFor,
    fallbackPage,
    filtersEqual,
    filtersFromParams,
    filtersToParams,
    filtersToQuery,
    hasActiveFilters,
    pendingRowsFromDrafts,
    removedFilter,
    reportRowFromItem,
    sortReportItems,
    toggledSort,
    updateFilters,
    type ReportFilters,
    type ReportRow,
  } from '$lib/features/reports/application/report-list';
  import ReportFilterBar from '$lib/features/reports/presentation/ReportFilterBar.svelte';
  import ReportTable from '$lib/features/reports/presentation/ReportTable.svelte';
  import ReportsPageHeader from '$lib/features/reports/presentation/ReportsPageHeader.svelte';
  import ReportsPagination from '$lib/features/reports/presentation/ReportsPagination.svelte';
  import { createPlatform } from '$lib/platform';
  import type { Platform } from '$lib/platform/contracts';
  import { clearSession, loadSession, session } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  type AuthState = 'loading' | 'ready' | 'denied' | 'error';

  let auth = $state<AuthState>('loading');
  let filters = $state<ReportFilters>(
    untrack(() => filtersFromParams(new URLSearchParams(page.url.search))),
  );
  let list = $state<ReportListResponse | null>(null);
  let localDrafts = $state<ReportDraft[]>([]);
  let loading = $state(true);
  let failure = $state<{ requestId?: string } | null>(null);
  let now = $state(new Date());

  let platform: Platform | null = null;
  let pendingDelete = $state<ReportRow | null>(null);
  let confirmOpen = $state(false);
  let deleting = false;
  let requestId = 0;
  let hasLoaded = false;

  const role = $derived(session.user?.role ?? null);
  const userId = $derived(session.user?.id ?? null);
  const canCreate = $derived(role === 'SUBMITTER');

  const clearHref = $derived(`/reports?${filtersToParams(clearedFilters(filters))}`);

  // Pending rows are a desktop affordance; the web build keeps this list empty.
  const pendingRows = $derived(
    localDrafts.length > 0 ? pendingRowsFromDrafts(localDrafts, list?.items ?? [], now) : [],
  );

  const rows = $derived([
    ...pendingRows,
    ...(list
      ? sortReportItems(list.items, filters.sort, filters.dir).map((item) =>
          reportRowFromItem(item, { role, userId, now }),
        )
      : []),
  ]);

  const chips = $derived(activeChips(filters, list?.facets ?? null));
  const empty = $derived(
    emptyStateFor(filters.tab, {
      hasFilters: hasActiveFilters(filters),
      canCreate,
      clearHref,
    }),
  );
  const deleteCopy = $derived(
    pendingDelete ? deleteDraftConfirmation(pendingDelete) : null,
  );

  async function loadAccount() {
    auth = 'loading';

    try {
      const account = await loadSession();

      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }

      if (account.status !== 'ACTIVE') {
        const destination = destinationAfterSignIn(account);
        if (destination) {
          await goto(destination, { replaceState: true });
        } else {
          clearSession();
          await goto('/login', { replaceState: true });
        }
        return;
      }

      auth = 'ready';
    } catch {
      auth = 'error';
    }
  }

  async function loadReports(query: ReportFilters) {
    const token = ++requestId;

    if (!hasLoaded) loading = true;
    failure = null;

    try {
      const result = await api.reports.list(filtersToQuery(query));
      if (token !== requestId) return;

      // A deleted last row or a narrowed filter falls back to the last valid page.
      const target = fallbackPage(result.total, result.size, query.page);
      if (target !== query.page) {
        await applyFilters({ page: target });
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

      if (error instanceof ApiError && error.status === 403) {
        auth = 'denied';
        return;
      }

      failure = { requestId: error instanceof ApiError ? error.requestId : undefined };
    } finally {
      if (token === requestId) loading = false;
    }
  }

  async function loadLocalDrafts() {
    try {
      platform ??= await createPlatform();
      if (platform.shell !== 'desktop') return;
      localDrafts = await platform.drafts.list();
    } catch {
      // The local mirror is unavailable; the server list is still complete.
      localDrafts = [];
    }
  }

  async function applyFilters(patch: Partial<ReportFilters>) {
    const next = updateFilters(filters, patch);
    if (filtersEqual(next, filters)) return;

    filters = next;
    await goto(`/reports?${filtersToParams(next)}`, { replaceState: true });
  }

  function sortBy(field: Parameters<typeof toggledSort>[1]) {
    void applyFilters({ ...toggledSort(filters, field), page: filters.page });
  }

  function retry() {
    hasLoaded = false;
    void loadReports(filters);
  }

  function askDelete(row: ReportRow) {
    if (!row.actions.delete.visible || !row.actions.delete.enabled) return;
    pendingDelete = row;
    confirmOpen = true;
  }

  async function deletePendingDraft(row: ReportRow) {
    if (!platform) return;
    await platform.drafts.remove(row.id);
    localDrafts = localDrafts.filter((draft) => draft.id !== row.id);
    toast.success('Draft deleted.');
  }

  async function confirmDelete() {
    const row = pendingDelete;
    if (!row || deleting) return;

    deleting = true;
    try {
      if (row.pendingSync) {
        await deletePendingDraft(row);
      } else {
        await api.reports.deleteDraft(row.id);
        toast.success('Draft deleted.');
        await loadReports(filters);
      }
    } catch {
      toast.error('The draft was not deleted. Try again.');
    } finally {
      deleting = false;
      pendingDelete = null;
    }
  }

  onMount(() => {
    void loadAccount();
    void loadLocalDrafts();
  });

  // Back/forward or a shared link replaces the local filter state.
  $effect(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(page.url.search));
    if (!filtersEqual(fromUrl, untrack(() => filters))) filters = fromUrl;
  });

  $effect(() => {
    if (auth !== 'ready') return;
    void loadReports(filters);
  });
</script>

<svelte:head><title>My reports · OVPCASSS Paperless PAR</title></svelte:head>

{#if auth === 'denied'}
  <ErrorState
    variant="permission"
    title="You cannot view the reports list."
    description="Your account does not have access to reports. Contact the OVPCASSS administrator if you believe this is a mistake."
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if auth === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to your inbox."
    onretry={() => void loadAccount()}
    backHref="/"
    backLabel="Back to inbox"
  />
{:else}
  <ReportsPageHeader {role} />

  <ReportFilterBar
    {filters}
    facets={list?.facets ?? null}
    {chips}
    onchange={(patch) => void applyFilters(patch)}
    onremove={(id) => void applyFilters(removedFilter(id))}
    onclear={() => void applyFilters(clearedFilters(filters))}
  />

  {#if failure}
    <div class="table-state">
      <ErrorState
        title="We could not load your reports"
        description="The list did not load. Try again, or return to your inbox."
        requestId={failure.requestId}
        onretry={retry}
        backHref="/"
        backLabel="Back to inbox"
      />
    </div>
  {:else if loading || !list}
    <SkeletonTable rows={8} widths={[18, 28, 12, 16, 14, 12, 4]} />
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
      onsort={sortBy}
      onopen={(row) => void goto(row.href)}
      onedit={(row) => void goto(`/reports/${row.id}/edit`)}
      ondelete={askDelete}
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

{#if confirmOpen && deleteCopy}
  <ConfirmDialog
    bind:open={confirmOpen}
    title={deleteCopy.title}
    description={deleteCopy.description}
    confirmLabel={deleteCopy.confirmLabel}
    tone="destructive"
    onconfirm={() => void confirmDelete()}
  />
{/if}

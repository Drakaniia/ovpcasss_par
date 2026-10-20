<script lang="ts">
  import type { AdminAuditListResponse, AuditEventDetail, AuditEventItem } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { loadSession, signOut } from '$lib/session/session.svelte';

  import {
    activeFilterCount,
    clearedFilters,
    filtersEqual,
    filtersFromParams,
    filtersToParams,
    filtersToQuery,
    hasActiveFilters,
    removeAuditChip,
    type AuditChip,
    type AuditFilters,
  } from '../application/audit-filters';
  import AuditChips from './AuditChips.svelte';
  import AuditEventRow from './AuditEventRow.svelte';
  import AuditFilterPane from './AuditFilterPane.svelte';
  import AuditHeader from './AuditHeader.svelte';
  import AuditPagination from './AuditPagination.svelte';
  import AuditSkeleton from './AuditSkeleton.svelte';

  type AuthState = 'loading' | 'ready' | 'denied' | 'error';

  let auth = $state<AuthState>('ready');
  let filters = $state<AuditFilters>(
    untrack(() => filtersFromParams(new URLSearchParams(page.url.search))),
  );
  let list = $state<AdminAuditListResponse | null>(null);
  let loading = $state(true);
  let failure = $state<{ requestId?: string; message?: string } | null>(null);

  let mobileFilterOpen = $state(false);

  // Accordion detail expansion
  let expandedId = $state<string | null>(null);
  let expandedDetail = $state<AuditEventDetail | null>(null);
  let loadingDetail = $state(false);
  let detailError = $state<string | null>(null);

  let requestId = 0;
  let hasLoaded = $state(false);

  const filterCount = $derived(activeFilterCount(filters));
  const isFiltered = $derived(hasActiveFilters(filters));

  async function loadAccount() {
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
          await signOut();
          await goto('/login', { replaceState: true });
        }
        return;
      }

      auth = account.role === 'ADMIN' ? 'ready' : 'denied';
      if (auth === 'ready') {
        void fetchEvents();
      }
    } catch {
      auth = 'error';
    }
  }

  async function fetchEvents() {
    const token = ++requestId;
    if (!hasLoaded) loading = true;
    failure = null;

    try {
      const query = filtersToQuery(filters);
      const res = await api.admin.audit.list(query);
      if (token !== requestId) return;

      list = res;
      hasLoaded = true;
    } catch (err) {
      if (token !== requestId) return;

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        auth = 'denied';
        return;
      }

      failure = {
        requestId: err instanceof ApiError ? err.requestId : undefined,
        message: err instanceof Error ? err.message : 'Failed to load audit events',
      };
    } finally {
      if (token === requestId) loading = false;
    }
  }

  async function applyFilters(nextFilters: AuditFilters) {
    if (filtersEqual(nextFilters, filters)) return;
    filters = nextFilters;
    mobileFilterOpen = false;
    const queryStr = filtersToParams(filters);
    await goto(`/admin/audit${queryStr ? `?${queryStr}` : ''}`, { replaceState: true });
    await fetchEvents();
  }

  function handleResetFilters() {
    void applyFilters(clearedFilters(filters));
  }

  function handleRemoveChip(field: AuditChip['field']) {
    const next = removeAuditChip(filters, field);
    void applyFilters(next);
  }

  function handlePageChange(newPage: number) {
    void applyFilters({ ...filters, page: newPage });
  }

  async function toggleRow(event: AuditEventItem) {
    if (expandedId === event.id) {
      expandedId = null;
      expandedDetail = null;
      detailError = null;
      return;
    }

    expandedId = event.id;
    expandedDetail = null;
    detailError = null;
    loadingDetail = true;

    try {
      const detail = await api.admin.audit.get(event.id);
      if (expandedId === event.id) {
        expandedDetail = detail;
      }
    } catch (err) {
      if (expandedId === event.id) {
        detailError = err instanceof Error ? err.message : 'Could not load event details.';
      }
    } finally {
      if (expandedId === event.id) {
        loadingDetail = false;
      }
    }
  }

  async function retryDetail(id: string) {
    loadingDetail = true;
    detailError = null;
    try {
      const detail = await api.admin.audit.get(id);
      if (expandedId === id) {
        expandedDetail = detail;
      }
    } catch (err) {
      if (expandedId === id) {
        detailError = err instanceof Error ? err.message : 'Could not load event details.';
      }
    } finally {
      if (expandedId === id) {
        loadingDetail = false;
      }
    }
  }

  onMount(() => {
    void loadAccount();
  });
</script>

<svelte:head><title>Audit log · OVPCASSS Paperless PAR</title></svelte:head>

<div class="admin-audit-page">
  <AuditHeader
    {filterCount}
    {mobileFilterOpen}
    ontogglefilters={() => (mobileFilterOpen = !mobileFilterOpen)}
  />

  {#if auth === 'denied'}
    <ErrorState
      variant="permission"
      requiredRole="ADMIN"
      title="You do not have access to this page"
      description="The audit log requires Administrator access. Contact the OVPCASSS administrator if you believe this is a mistake."
    />
  {:else if auth === 'error'}
    <ErrorState
      variant="error"
      title="Failed to verify account permissions"
      description="We could not verify your session. Please retry or sign in again."
      onretry={loadAccount}
    />
  {:else}
    <div class="audit-layout">
      <!-- Left pane: Filters (320px at >=1280px) -->
      <aside
        class="filter-pane-container"
        class:is-mobile-open={mobileFilterOpen}
        aria-label="Filter sidebar"
      >
        <AuditFilterPane
          {filters}
          onapply={applyFilters}
          onreset={handleResetFilters}
          disabled={loading && !hasLoaded}
        />
      </aside>

      <!-- Right pane: Event List -->
      <main class="events-main-pane" aria-label="Audit events">
        <AuditChips
          {filters}
          total={list?.total ?? 0}
          onremove={handleRemoveChip}
          onclearall={handleResetFilters}
        />

        {#if failure}
          <ErrorState
            variant="error"
            title="We could not load audit events"
            description="The request did not complete. Try again, or adjust your filters."
            requestId={failure.requestId}
            onretry={fetchEvents}
          />
        {:else if loading && !hasLoaded}
          <AuditSkeleton rows={8} />
        {:else if !list || list.items.length === 0}
          {#if isFiltered}
            <EmptyState
              title="No events match these filters."
              description="Adjust the filters, or clear them to view all audit records."
              action={{ label: 'Clear filters', onclick: handleResetFilters }}
              actionVariant="outline"
            />
          {:else}
            <EmptyState
              title="No audit events yet."
              description="Audit records will be recorded and shown here as actions occur in the system."
            />
          {/if}
        {:else}
          <div class="audit-list-box" role="region" aria-label="Event rows">
            {#each list.items as event (event.id)}
              <AuditEventRow
                {event}
                expanded={expandedId === event.id}
                detail={expandedId === event.id ? expandedDetail : null}
                loadingDetail={expandedId === event.id && loadingDetail}
                detailError={expandedId === event.id ? detailError : null}
                ontoggle={() => toggleRow(event)}
                onretrydetail={() => retryDetail(event.id)}
              />
            {/each}
          </div>

          <AuditPagination
            total={list.total}
            page={filters.page}
            onpage={handlePageChange}
          />
        {/if}
      </main>
    </div>
  {/if}
</div>

<style>
  .admin-audit-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
  }

  .audit-layout {
    display: flex;
    gap: 24px;
    width: 100%;
  }

  .events-main-pane {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .audit-list-box {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }

  /* Responsive layout: 320 px sticky pane at >=1280 px; collapsible above list below 1280 px */
  @media (min-width: 1280px) {
    .filter-pane-container {
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      position: sticky;
      top: 24px;
      width: 320px;
    }
  }

  @media (max-width: 1279px) {
    .audit-layout {
      flex-direction: column;
    }

    .filter-pane-container {
      display: none;
      width: 100%;
    }

    .filter-pane-container.is-mobile-open {
      display: block;
    }
  }
</style>

<script lang="ts">
  import type { RepositorySortField } from '@par/shared';
  import { AlertCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';

  import {
    activeChips,
    filterEcho,
    removedFilter,
    type RepositoryChipId,
  } from '../application/repository-chips';
  import {
    activeFilterCount,
    clearedFilters,
    hasActiveFilters,
    hasQuery,
    panelStartsOpen,
    repositoryQueryFor,
    toggledSort,
  } from '../application/repository-filter-scope';
  import {
    exportHref,
    filtersEqual,
    filtersFromParams,
    repositoryHref,
    updateFilters,
    type RepositoryFilters,
  } from '../application/repository-filters';
  import {
    countLine,
    REPOSITORY_IDLE_LINE,
    REPOSITORY_SCOPE_LINE,
    repositoryEmptyState,
    repositoryRowFromItem,
    type RepositoryRow,
  } from '../application/repository-rows';
  import { RepositoryState } from '../application/repository-state.svelte';
  import { paneAvailable } from './repository-viewport';
  import SearchFilters from './SearchFilters.svelte';
  import SearchPagination from './SearchPagination.svelte';
  import SearchPreview from './SearchPreview.svelte';
  import SearchResults from './SearchResults.svelte';
  import SearchSuggestions from './SearchSuggestions.svelte';
  import SearchToolbar from './SearchToolbar.svelte';

  /**
   * The repository (UI spec §7.11). It defaults to every approved report, newest
   * date received first, searches the full record, and can hand its exact scope
   * to the exports screen. Query, filters, sort, and page are URL state.
   */
  const repository = untrack(() => new RepositoryState());

  let filters = $state(untrack(() => filtersFromParams(new URLSearchParams(page.url.search))));
  let panelOpen = $state(untrack(() => panelStartsOpen(filters)));

  const rows = $derived(
    repository.items.map((item) => repositoryRowFromItem(item, { query: filters.q })),
  );
  const selectedRow = $derived(rows.find((row) => row.id === repository.selectedId) ?? null);
  const chips = $derived(activeChips(filters, repository.facets));
  const filterCount = $derived(activeFilterCount(filters));
  const echo = $derived(filterEcho(filters, repository.facets));
  const idle = $derived(!hasQuery(filters) && !hasActiveFilters(filters));
  const empty = $derived(
    repositoryEmptyState({
      hasFilters: hasActiveFilters(filters),
      hasQuery: hasQuery(filters),
      clearHref: repositoryHref(clearedFilters(filters)),
    }),
  );
  const showingResults = $derived(!repository.loading && !repository.loadFailed && rows.length > 0);

  async function applyFilters(patch: Partial<RepositoryFilters>) {
    const next = updateFilters(filters, patch);
    if (filtersEqual(next, filters)) return;

    filters = next;
    await goto(repositoryHref(next), { replaceState: true });
  }

  function sortBy(field: RepositorySortField) {
    void applyFilters(toggledSort(filters, field));
  }

  /** Row click: the pane only exists at the master–detail width. */
  function openRow(row: RepositoryRow) {
    if (paneAvailable()) {
      void repository.select(row.id);
      return;
    }

    void goto(row.href);
  }

  function retry() {
    void repository.reload(repositoryQueryFor(filters));
  }

  onMount(() => void repository.load());

  // Back/forward or a shared link replaces the local filter state.
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

  // One search per scope change; the API owns the ordering and the paging.
  $effect(() => {
    if (repository.view !== 'ready') return;

    const query = repositoryQueryFor(filters);
    void repository.reload(query).then((target) => {
      if (target === null) return;
      void applyFilters({ page: target });
    });
  });
</script>

<svelte:head><title>Repository · OVPCASSS Paperless PAR</title></svelte:head>

{#snippet notice()}
  <div class="notice" role="status">
    <div class="notice-text">
      <p class="notice-title">
        <AlertCircle size={16} aria-hidden="true" />
        <span>{repository.notice?.title}</span>
      </p>
      <p>{repository.notice?.description}</p>
      {#if repository.notice?.requestId}
        <p class="request-id">
          Request ID: <span class="mono">{repository.notice.requestId}</span>
        </p>
      {/if}
    </div>
    <button class="btn btn-outline" type="button" onclick={retry}>Retry</button>
  </div>
{/snippet}

{#if repository.view === 'denied'}
  <ErrorState
    variant="permission"
    title="You do not have access to the repository"
    description="The repository is available to reviewers, approvers, and administrators. Contact the OVPCASSS administrator if you believe this is a mistake."
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if repository.view === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to your inbox."
    onretry={() => void repository.load()}
    backHref="/"
    backLabel="Back to inbox"
  />
{:else}
  <header class="page-head">
    <h1>Repository</h1>
    {#if idle}<p class="lede">{REPOSITORY_IDLE_LINE}</p>{/if}
    <p class="scope">{REPOSITORY_SCOPE_LINE}</p>
  </header>

  <SearchToolbar
    {filters}
    facets={repository.facets}
    {chips}
    {filterCount}
    {panelOpen}
    onquery={(q) => void applyFilters({ q })}
    onchange={(patch) => void applyFilters(patch)}
    onremove={(id: RepositoryChipId) => void applyFilters(removedFilter(id))}
    onclear={() => void applyFilters(clearedFilters(filters))}
    ontogglepanel={() => (panelOpen = !panelOpen)}
  />

  <SearchFilters
    {filters}
    facets={repository.facets}
    open={panelOpen}
    onapply={(patch) => void applyFilters(patch)}
  />

  <p class="sr-only" role="status">{repository.announcement}</p>

  {#if repository.notice && showingResults}
    {@render notice()}
  {/if}

  <div class="results-layout">
    <div class="results-list">
      {#if repository.loadFailed}
        <div class="table-state">
          <ErrorState
            title="We could not run the search"
            description="The search did not complete. Your filters are kept; try again."
            requestId={repository.requestId}
            onretry={retry}
            backHref="/"
            backLabel="Back to inbox"
          />
        </div>
      {:else if repository.loading}
        <SkeletonTable rows={8} widths={[14, 20, 32, 12, 12, 10]} />
      {:else if rows.length === 0 && repository.notice}
        <div class="table-state">{@render notice()}</div>
      {:else if rows.length === 0}
        <div class="table-state">
          <EmptyState
            title={empty.title}
            description={empty.description}
            action={empty.action}
            actionVariant="outline"
          />
          {#if empty.action}
            <SearchSuggestions
              {filters}
              facets={repository.facets}
              onapply={(patch) => void applyFilters(patch)}
            />
          {/if}
        </div>
      {:else}
        <div class="scope-bar">
          <p class="count">{countLine(repository.total)}</p>
          {#if echo}
            <p class="echo">{echo}</p>
          {/if}
          <a class="btn btn-outline export" href={exportHref(filters)}>Export these results</a>
        </div>

        <SearchResults
          {rows}
          {filters}
          selectedId={repository.selectedId}
          onsort={sortBy}
          onselect={openRow}
        />

        <SearchPagination
          total={repository.total}
          page={filters.page}
          onpage={(next) => void applyFilters({ page: next })}
        />
      {/if}
    </div>

    <div class="preview-column">
      <SearchPreview
        row={selectedRow}
        preview={repository.preview}
        references={repository.references}
        onretry={() => void repository.reloadPreview()}
      />
    </div>
  </div>
{/if}

<style>
  .page-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 16px;
  }

  h1 {
    margin: 0;
  }

  .lede {
    font-size: 14px;
    margin: 0;
  }

  .scope {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .results-layout {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr);
  }

  /* Master–detail appears only when there is room for both (UI spec §12). */
  @media (min-width: 1440px) {
    .results-layout {
      grid-template-columns: minmax(0, 1.15fr) minmax(360px, 1fr);
    }
  }

  @media (max-width: 1439px) {
    .preview-column {
      display: none;
    }
  }

  .results-list {
    min-width: 0;
  }

  .table-state {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
  }

  .scope-bar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 8px;
  }

  .count {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    margin: 0;
  }

  .echo {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .export {
    margin-left: auto;
  }

  .notice {
    align-items: flex-start;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--warning-700);
    border-radius: var(--radius-card);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 12px 16px;
  }

  .notice-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .notice-title {
    align-items: center;
    color: var(--text-primary);
    display: flex;
    font-size: 13px;
    font-weight: 500;
    gap: 6px;
    margin: 0;
  }

  .notice-text p {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .request-id {
    font-size: 12px;
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>

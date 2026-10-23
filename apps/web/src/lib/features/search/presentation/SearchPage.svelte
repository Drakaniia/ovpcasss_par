<script lang="ts">
  import type { RepositorySortField } from '@par/shared';
  import { AlertCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick, untrack } from 'svelte';

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
  import { paneWide } from './repository-viewport';
  import SearchFilters from './SearchFilters.svelte';
  import SearchPagination from './SearchPagination.svelte';
  import SearchPreview from './SearchPreview.svelte';
  import SearchResults from './SearchResults.svelte';
  import SearchSuggestions from './SearchSuggestions.svelte';
  import SearchToolbar from './SearchToolbar.svelte';

  /**
   * The repository (UI spec §7.11). It defaults to every approved report, newest
   * date received first, searches the full record, and can hand its exact scope
   * to the exports screen. Query, filters, sort, page, and the open report are
   * URL state.
   */
  const repository = untrack(() => new RepositoryState());

  let filters = $state(untrack(() => filtersFromParams(new URLSearchParams(page.url.search))));
  let panelOpen = $state(untrack(() => panelStartsOpen(filters)));
  /** Back and Forward close the pane through the URL; only Back restores focus. */
  let focusOnClose = false;

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

  /** The open report is in the URL, so Back closes the pane and a link reopens it. */
  function reportParam(): string | null {
    return new URLSearchParams(page.url.search).get('report');
  }

  /** The href this page wrote last, so its own URL never echoes back. */
  let writtenHref = untrack(() => repositoryHref(filters));

  /**
   * The URL records the filters; it is not a page move. `reset: false` keeps the
   * scroll position and the caret in the field being typed in.
   */
  function applyFilters(patch: Partial<RepositoryFilters>) {
    const next = updateFilters(filters, patch);
    if (filtersEqual(next, filters)) return;

    filters = next;
    const href = repositoryHref(next);
    writtenHref = href;
    void goto(href, { replace: true, reset: false }).catch(() => {});
  }

  function sortBy(field: RepositorySortField) {
    void applyFilters(toggledSort(filters, field));
  }

  /** One click, one meaning: open the pane at desktop widths, otherwise the page. */
  function openRow(row: RepositoryRow) {
    if (!paneWide()) {
      void goto(row.href);
      return;
    }

    void goto(repositoryHref(filters, row.id), { replaceState: false });
    void repository.select(row.id);
  }

  async function closePreview() {
    const id = repository.selectedId;
    repository.clearSelection();
    await goto(repositoryHref(filters), { replaceState: true });
    await tick();

    const row = id ? document.getElementById(`report-row-${id}`) : null;
    (row ?? document.getElementById('results-heading'))?.focus();
  }

  function focusPreview() {
    document.getElementById('preview-title')?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && repository.selectedId) {
      event.preventDefault();
      void closePreview();
      return;
    }

    if (!event.altKey || event.key !== 'ArrowRight' || !repository.selectedId) return;
    event.preventDefault();
    focusPreview();
  }

  function retry() {
    void repository.reload(repositoryQueryFor(filters));
  }

  function onPopState() {
    focusOnClose = true;
  }

  onMount(() => {
    void repository.load();
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('popstate', onPopState);
    };
  });

  // Back/forward or a shared link replaces the local filter state.
  $effect(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(page.url.search));
    const incoming = repositoryHref(fromUrl);
    // Skip the URL this page just wrote; only Back, a link, or a pasted URL is
    // an outside change that should replace the filters.
    if (incoming === writtenHref) return;

    writtenHref = incoming;
    if (
      !filtersEqual(
        fromUrl,
        untrack(() => filters),
      )
    )
      filters = fromUrl;
  });

  // The open report follows the URL in both directions, including Back. A link
  // to a report outside the current results keeps the URL and shows not-found.
  $effect(() => {
    const id = reportParam();
    const fromHistory = focusOnClose;
    focusOnClose = false;

    if (repository.view !== 'ready' || !repository.loaded) return;
    if (id === untrack(() => repository.selectedId)) return;

    if (!id) {
      const closedId = untrack(() => repository.selectedId);
      repository.clearSelection();

      if (closedId && fromHistory) {
        void tick().then(() =>
          (
            document.getElementById(`report-row-${closedId}`) ??
            document.getElementById('results-heading')
          )?.focus(),
        );
      }
    } else if (repository.items.some((item) => item.id === id)) void repository.select(id);
    else repository.markNotFound(id);
  });

  // One search per scope change; the API owns the ordering and the paging.
  $effect(() => {
    if (repository.view !== 'ready') return;

    const query = repositoryQueryFor(filters);
    void repository.reload(query).then((target) => {
      if (target !== null) {
        void applyFilters({ page: target });
        return;
      }

      // A report named in the URL but outside these results keeps the pane open
      // with the shared not-found state; a linked report is never an error page.
      const id = reportParam();
      if (
        id &&
        repository.selectedId === null &&
        !repository.items.some((item) => item.id === id)
      ) {
        repository.markNotFound(id);
      }
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
    description="The repository is available to signed-in accounts. Contact the OVPCASSS administrator if you believe this is a mistake."
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

  <div class="results-layout" class:open={repository.selectedId !== null}>
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
          <p class="count" id="results-heading" tabindex="-1">{countLine(repository.total)}</p>
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

    {#if repository.selectedId !== null}
      <div class="preview-column">
        <SearchPreview
          row={selectedRow}
          preview={repository.preview}
          onretry={() => void repository.reloadPreview()}
          onclose={() => void closePreview()}
        />
      </div>
    {/if}
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

  /* One section until a row is chosen; the split only exists when there is a
     report to show beside the list. */
  .results-layout {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr);
    transition: grid-template-columns var(--duration-base) var(--ease-standard);
  }

  @media (min-width: 1024px) {
    .results-layout.open {
      grid-template-columns: minmax(0, 1fr) minmax(380px, 0.9fr);
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

  .count:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
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

  @media (prefers-reduced-motion: reduce) {
    .results-layout {
      transition: none;
    }
  }
</style>

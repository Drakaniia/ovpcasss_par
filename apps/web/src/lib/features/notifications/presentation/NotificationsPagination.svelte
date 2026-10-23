<script lang="ts">
  import { NOTIFICATION_PAGE_SIZE } from '@par/shared';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  import { pageCountFor, pageWindow, showingRange } from '$lib/pagination';

  /** Phase 11 §2: 50 rows a page, the same paging math as the other lists. */
  let { total, page, onpage }: { total: number; page: number; onpage: (page: number) => void } =
    $props();

  const count = $derived(pageCountFor(total, NOTIFICATION_PAGE_SIZE));
  const range = $derived(showingRange(page, NOTIFICATION_PAGE_SIZE, total));
  const pages = $derived(pageWindow(page, count));
</script>

<nav class="pagination" aria-label="Notifications pagination">
  <p class="range">Showing {range.from}–{range.to} of {total}</p>

  {#if count > 1}
    <div class="pages">
      <button
        class="page-button"
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onclick={() => onpage(page - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {#each pages as entry, index (index)}
        {#if entry === null}
          <span class="ellipsis" aria-hidden="true">…</span>
        {:else}
          <button
            class="page-button"
            class:is-current={entry === page}
            type="button"
            aria-label="Page {entry}"
            aria-current={entry === page ? 'page' : undefined}
            onclick={() => onpage(entry)}
          >
            {entry}
          </button>
        {/if}
      {/each}

      <button
        class="page-button"
        type="button"
        aria-label="Next page"
        disabled={page >= count}
        onclick={() => onpage(page + 1)}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  {/if}
</nav>

<style>
  .pagination {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    margin-top: 16px;
  }

  .range {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  .pages {
    align-items: center;
    display: flex;
    gap: 4px;
  }

  .page-button {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    display: inline-flex;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    height: 28px;
    justify-content: center;
    min-width: 28px;
    padding: 0 6px;
  }

  .page-button:hover:not(:disabled) {
    background: var(--surface-page);
  }

  .page-button:disabled {
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .page-button.is-current {
    background: var(--primary-subtle);
    border-color: var(--primary);
    color: var(--primary);
    font-weight: 600;
  }

  .ellipsis {
    color: var(--text-secondary);
    font-size: 12px;
    padding: 0 2px;
  }
</style>

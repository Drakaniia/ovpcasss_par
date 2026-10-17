<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  import {
    PAGE_SIZES,
    pageCountFor,
    pageWindow,
    showingRange,
    type PageSize,
  } from '../application/user-directory';

  let {
    total,
    page,
    pageSize,
    onpage,
    onpagesize,
  }: {
    total: number;
    page: number;
    pageSize: number;
    onpage: (page: number) => void;
    onpagesize: (size: PageSize) => void;
  } = $props();

  const count = $derived(pageCountFor(total, pageSize));
  const range = $derived(showingRange(page, pageSize, total));
  const pages = $derived(pageWindow(page, count));
</script>

<nav class="pagination" aria-label="Accounts pagination">
  <p class="range">
    Showing {range.from}–{range.to} of {total}
  </p>

  <div class="controls">
    <label class="size">
      <span>Rows per page</span>
      <select
        class="select size-select"
        value={pageSize}
        onchange={(event) => onpagesize(Number(event.currentTarget.value) as PageSize)}
      >
        {#each PAGE_SIZES as size (size)}
          <option value={size}>{size}</option>
        {/each}
      </select>
    </label>

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
  </div>
</nav>

<style>
  .pagination {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    margin-top: 12px;
  }

  .range {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .controls {
    align-items: center;
    display: flex;
    gap: 16px;
  }

  .size {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 12px;
    gap: 8px;
  }

  .size-select {
    height: 28px;
    min-height: 28px;
    padding: 2px 6px;
    width: 68px;
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

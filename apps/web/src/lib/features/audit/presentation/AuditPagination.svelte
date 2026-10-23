<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  import { pageCountFor, pageWindow, showingRange } from '$lib/pagination';

  const AUDIT_PAGE_SIZE = 50;

  let {
    total,
    page,
    onpage,
  }: {
    total: number;
    page: number;
    onpage: (page: number) => void;
  } = $props();

  const count = $derived(pageCountFor(total, AUDIT_PAGE_SIZE));
  const range = $derived(showingRange(page, AUDIT_PAGE_SIZE, total));
  const pages = $derived(pageWindow(page, count));
</script>

<nav class="audit-pagination" aria-label="Audit log pagination">
  <p class="range">Showing {range.from}–{range.to} of {total.toLocaleString()}</p>

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
  .audit-pagination {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 8px;
  }

  .range {
    color: var(--text-secondary);
    font-size: 13px;
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
    border-radius: var(--radius-badge);
    color: var(--text-primary);
    display: inline-flex;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    height: 32px;
    justify-content: center;
    min-width: 32px;
    padding: 0 6px;
  }

  .page-button:hover:not(:disabled) {
    background: var(--row-hover);
  }

  .page-button:disabled {
    color: var(--text-disabled, rgba(0, 0, 0, 0.3));
    cursor: not-allowed;
    opacity: 0.5;
  }

  .page-button.is-current {
    background: var(--primary-subtle);
    border-color: var(--primary, #1e3a8a);
    color: var(--primary, #1e3a8a);
    font-weight: 600;
  }

  .ellipsis {
    color: var(--text-secondary);
    font-size: 13px;
    padding: 0 4px;
  }
</style>

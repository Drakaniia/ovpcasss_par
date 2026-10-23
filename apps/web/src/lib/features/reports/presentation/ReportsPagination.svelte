<script lang="ts">
  import type { ReportPageSize } from '@par/shared';
  import { REPORT_PAGE_SIZES } from '@par/shared';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  let {
    total,
    page,
    pageSize,
    onpage,
    onpagesize,
  }: {
    total: number;
    page: number;
    pageSize: ReportPageSize;
    onpage: (page: number) => void;
    onpagesize: (size: ReportPageSize) => void;
  } = $props();

  const pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
  const to = $derived(Math.min(total, page * pageSize));
</script>

<div class="pagination">
  <p class="count-line">
    {from}–{to} of {total}
    {total === 1 ? 'record' : 'records'}
  </p>

  <div class="controls">
    <label class="size">
      <span>Rows</span>
      <select
        class="select"
        value={String(pageSize)}
        onchange={(event) => onpagesize(Number(event.currentTarget.value) as ReportPageSize)}
      >
        {#each REPORT_PAGE_SIZES as size (size)}
          <option value={String(size)}>{size}</option>
        {/each}
      </select>
    </label>

    <button
      class="icon-action"
      type="button"
      aria-label="Previous page"
      disabled={page <= 1}
      onclick={() => onpage(page - 1)}
    >
      <ChevronLeft size={16} aria-hidden="true" />
    </button>
    <span class="page-label">Page {page} of {pages}</span>
    <button
      class="icon-action"
      type="button"
      aria-label="Next page"
      disabled={page >= pages}
      onclick={() => onpage(page + 1)}
    >
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </div>
</div>

<style>
  .pagination {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-top: 12px;
  }

  .count-line {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  .controls {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .size {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 12px;
    gap: 6px;
  }

  .size .select {
    font-size: 12px;
    min-height: 28px;
  }

  .icon-action {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .icon-action:hover:not(:disabled) {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .icon-action:disabled {
    color: var(--text-disabled);
  }

  .page-label {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
</style>

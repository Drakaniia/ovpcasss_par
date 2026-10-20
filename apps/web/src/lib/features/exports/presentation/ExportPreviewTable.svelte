<script lang="ts">
  import type { MonitoringPreviewSheet, MonitoringSheetRow } from '@par/shared';
  import { AlertCircle } from '@lucide/svelte';

  import { formatDate } from '$lib/format/datetime';

  let { sheet }: { sheet: MonitoringPreviewSheet } = $props();

  const DATE_KEYS = new Set(['dateReceived', 'activityDate', 'dateCompleted']);

  let showAllWarnings = $state(false);

  const visibleWarnings = $derived(
    showAllWarnings ? sheet.warnings : sheet.warnings.slice(0, 5),
  );

  function cellValue(row: MonitoringSheetRow, key: string): string {
    const value = (row as unknown as Record<string, unknown>)[key];

    if (value === null || value === undefined || value === '') return '';

    if (DATE_KEYS.has(key) && typeof value === 'string') return formatDate(value);

    return String(value);
  }
</script>

<div class="card preview-card">
  <div class="preview-head">
    <p class="preview-line">
      PREVIEW · {sheet.total}
      {sheet.total === 1 ? 'report' : 'reports'}
      {#if sheet.inProgressCount > 0}
        ({sheet.approvedCount} approved, {sheet.inProgressCount} in progress)
      {/if}
      · {sheet.missingCount}
      {sheet.missingCount === 1 ? 'report' : 'reports'} with missing values
    </p>
    <p class="sheet-title">{sheet.title.split('\n').join(' · ')}</p>
  </div>

  {#if sheet.warnings.length > 0}
    <div class="warnings">
      {#each visibleWarnings as warning (warning)}
        <p class="warning">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{warning}</span>
        </p>
      {/each}
      {#if sheet.warnings.length > 5}
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => (showAllWarnings = !showAllWarnings)}>
          {showAllWarnings ? 'Show fewer' : `Show all (${sheet.warnings.length})`}
        </button>
      {/if}
    </div>
  {/if}

  {#if sheet.rows.length === 0}
    <p class="empty-line">
      No reports for this sheet in the selected term. The sheet is still written with its title and
      headers.
    </p>
  {:else}
    <div class="table-scroll preview-scroll">
      <table class="data-table preview-table">
        <caption class="sr-only">Monitoring sheet preview: {sheet.sheetName}</caption>
        <thead>
          <tr>
            {#each sheet.columns as column (column.key)}
              <th scope="col">{column.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each sheet.rows as row (row.index)}
            <tr>
              {#each sheet.columns as column (column.key)}
                {@const value = cellValue(row, column.key)}
                <td title={value || undefined}>{value}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if sheet.total > sheet.rows.length}
      <p class="cap-line">Previewing {sheet.rows.length} of {sheet.total}. The download includes every row.</p>
    {/if}
  {/if}
</div>

<style>
  .preview-card {
    margin-top: 16px;
    overflow: hidden;
  }

  .preview-head {
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
  }

  .preview-line {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin: 0;
  }

  .sheet-title {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .warnings {
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 16px;
  }

  .warning {
    align-items: flex-start;
    color: var(--warning-700);
    display: flex;
    font-size: 12px;
    gap: 6px;
    margin: 0;
  }

  .empty-line,
  .cap-line {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 16px;
  }

  .preview-scroll {
    border: 0;
    border-radius: 0;
    max-height: 460px;
  }

  .preview-table {
    font-size: 12px;
    width: max-content;
    min-width: 100%;
  }

  .preview-table :global(tbody tr) {
    cursor: default;
  }

  .preview-table :global(th),
  .preview-table :global(td) {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-table :global(th:first-child),
  .preview-table :global(td:first-child) {
    background: var(--surface-card);
    left: 0;
    position: sticky;
    z-index: 2;
  }

  .preview-table :global(th:first-child) {
    z-index: 3;
  }
</style>

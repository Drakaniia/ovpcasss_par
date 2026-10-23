<script lang="ts">
  import { AlertCircle, X } from '@lucide/svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';

  import type { RepositoryPreview as RepositoryPreviewData } from '../application/repository-state.svelte';
  import type { RepositoryRow } from '../application/repository-rows';

  /**
   * The pane beside the results once a row is chosen (UI spec §7.11): the
   * record's key facts and one way into the full report. Nothing else changes
   * on the page; closing it returns to the full-width list.
   */
  let {
    row,
    preview,
    onretry,
    onclose,
  }: {
    row: RepositoryRow | null;
    preview: RepositoryPreviewData;
    onretry: () => void;
    onclose: () => void;
  } = $props();

  let heading = $state<HTMLHeadingElement | null>(null);

  // Opening a report moves focus to the pane; the row keeps its place in the list.
  $effect(() => {
    if (row || preview.notFound) heading?.focus({ preventScroll: true });
  });
</script>

<aside class="search-pane" aria-labelledby="preview-title">
  <header class="pane-head">
    <button class="close" type="button" aria-label="Close preview" onclick={onclose}>
      <X size={16} aria-hidden="true" />
    </button>
    {#if row}<p class="reference mono">{row.referenceNo ?? 'No AR No.'}</p>{/if}
    <h2 id="preview-title" tabindex="-1" bind:this={heading}>
      {row?.title ?? 'Report not available'}
    </h2>
    {#if row}<StatusBadge status={row.status} />{/if}

    {#if row}
      <dl class="facts">
        <div>
          <dt>Received</dt>
          <dd class="mono">{row.received}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{row.typeLabel}</dd>
        </div>
        <div>
          <dt>College</dt>
          <dd>{row.college}</dd>
        </div>
        <div>
          <dt>Activity date</dt>
          <dd class="mono">{row.activity}</dd>
        </div>
        <div>
          <dt>Classification</dt>
          <dd>{row.classificationLabel}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>{row.levelLabel}</dd>
        </div>
      </dl>
    {/if}
  </header>

  <div class="pane-body">
    {#if preview.loading}
      <div class="summary-skeleton" aria-busy="true">
        <span class="sr-only">Loading the report summary</span>
        {#each [64, 88, 72] as width, index (index)}
          <div class="skeleton line" style="width: {width}%"></div>
        {/each}
      </div>
    {:else if preview.notFound}
      <div class="pane-error" role="alert">
        <p class="heading">This report does not exist or you do not have access</p>
        <p>The report may have been removed, or your access to it may have changed.</p>
        <button class="btn btn-outline" type="button" onclick={onclose}>Back to results</button>
      </div>
    {:else if preview.error}
      <div class="pane-error" role="alert">
        <p>
          <AlertCircle size={16} aria-hidden="true" />
          <span>The report summary did not load.</span>
        </p>
        <button class="btn btn-outline" type="button" onclick={onretry}>Retry</button>
      </div>
    {/if}

    {#if row}<a class="btn btn-outline open-full" href={row.href}>Open full report</a>{/if}
  </div>
</aside>

<style>
  .search-pane {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 240px);
    overflow-y: auto;
    position: sticky;
    top: 24px;
  }

  .pane-head {
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    position: relative;
  }

  .pane-head h2 {
    font-size: 16px;
    line-height: 1.3;
    margin: 0;
    padding-right: 28px;
  }

  .pane-head h2:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .close {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-badge);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    position: absolute;
    right: 10px;
    top: 10px;
    width: 28px;
  }

  .close:hover {
    background: var(--status-neutral-bg);
    color: var(--text-primary);
  }

  .reference {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .facts {
    display: grid;
    gap: 8px 16px;
    grid-template-columns: 1fr 1fr;
    margin: 4px 0;
  }

  .facts dt {
    color: var(--text-secondary);
    font-size: 11px;
    text-transform: uppercase;
  }

  .facts dd {
    font-size: 13px;
    margin: 2px 0 0;
  }

  .pane-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .open-full {
    align-self: flex-start;
  }

  .pane-error {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pane-error p {
    align-items: flex-start;
    display: flex;
    font-size: 13px;
    gap: 6px;
    margin: 0;
  }

  .pane-error p.heading {
    color: var(--text-primary);
    font-weight: 500;
  }

  .summary-skeleton {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .line {
    height: 10px;
  }
</style>

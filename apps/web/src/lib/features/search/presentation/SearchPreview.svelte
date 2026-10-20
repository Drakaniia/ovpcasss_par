<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import {
    facsimileSections,
    type FacsimileReferences,
  } from '$lib/features/facsimile/application/facsimile-document';

  import type { RepositoryPreview as RepositoryPreviewData } from '../application/repository-state.svelte';
  import type { RepositoryRow } from '../application/repository-rows';

  /**
   * The pane beside the results at ≥1440 px (UI spec §7.11): the record's key
   * facts, a compact facsimile summary, and one way into the full report. The
   * facsimile and the print actions stay on the report page.
   */
  let {
    row,
    preview,
    references,
    onretry,
  }: {
    row: RepositoryRow | null;
    preview: RepositoryPreviewData;
    references: FacsimileReferences;
    onretry: () => void;
  } = $props();

  const detail = $derived(preview.detail);
  const sections = $derived(detail ? facsimileSections(detail, references).slice(0, 2) : []);
</script>

<aside class="search-pane" aria-label="Selected report">
  {#if !row}
    <div class="pane-empty">
      <h2>Select a report</h2>
      <p>The report opens here with its summary, status, and a link to the full record.</p>
    </div>
  {:else}
    <header class="pane-head">
      <p class="reference mono">{row.trackingNumber ?? 'No tracking number'}</p>
      <h2>{row.title}</h2>
      <StatusBadge status={row.status} />

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
    </header>

    <div class="pane-body">
      {#if preview.loading}
        <div class="summary-skeleton" aria-busy="true">
          <span class="sr-only">Loading the report summary</span>
          {#each [64, 88, 72, 80, 56] as width, index (index)}
            <div class="skeleton line" style="width: {width}%"></div>
          {/each}
        </div>
      {:else if preview.notFound}
        <div class="pane-error" role="alert">
          <p class="heading">This report does not exist or you do not have access</p>
          <p>The report may have been removed, or your access to it may have changed.</p>
        </div>
      {:else if preview.error}
        <div class="pane-error" role="alert">
          <p>
            <AlertCircle size={16} aria-hidden="true" />
            <span>The report summary did not load.</span>
          </p>
          <button class="btn btn-outline" type="button" onclick={onretry}>Retry</button>
        </div>
      {:else if detail}
        {#each sections as section (section.id)}
          <section class="pane-section">
            <h3>{section.numeral}. {section.title}</h3>
            <dl>
              {#each section.rows as item (item.label)}
                <div>
                  <dt>{item.label}</dt>
                  <dd class:multiline={item.multiline}>{item.value}</dd>
                </div>
              {/each}
            </dl>
          </section>
        {/each}
      {/if}

      <a class="btn btn-outline open-full" href={row.href}>Open full report</a>
    </div>
  {/if}
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

  .pane-empty {
    color: var(--text-secondary);
    padding: 48px 24px;
    text-align: center;
  }

  .pane-empty h2 {
    color: var(--text-primary);
    font-size: 16px;
    margin: 0 0 6px;
  }

  .pane-empty p {
    font-size: 13px;
    margin: 0 auto;
    max-width: 34ch;
  }

  .pane-head {
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
  }

  .pane-head h2 {
    font-size: 16px;
    line-height: 1.3;
    margin: 0;
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

  .pane-section h3 {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .pane-section dl {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
  }

  .pane-section dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .pane-section dd {
    font-size: 13px;
    margin: 0;
  }

  .multiline {
    white-space: pre-line;
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

<script lang="ts">
  import type { QueueKind } from '@par/shared';
  import { AlertCircle } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import {
    facsimileSections,
    type FacsimileReferences,
  } from '$lib/features/facsimile/application/facsimile-document';

  import type { QueuePreview as QueuePreviewData } from '../application/queue-state.svelte';
  import {
    QUEUE_SELECTION_HINT,
    queueSelectionPrompt,
    queueWaitingHeading,
    type QueueRow,
  } from '../application/queue-rows';

  /**
   * The pane beside the queue (UI spec §7.9): facts and decision buttons at the
   * top, the first facsimile sections below, and the full document one click
   * away. The document is never crammed into the column.
   *
   * The decision buttons arrive as a snippet, so the page owns which role's
   * control is rendered and the pane stays a layout.
   */
  let {
    kind,
    row,
    preview,
    references,
    onretry,
    actions,
  }: {
    kind: QueueKind;
    row: QueueRow | null;
    preview: QueuePreviewData;
    references: FacsimileReferences;
    onretry: () => void;
    actions?: Snippet;
  } = $props();

  const detail = $derived(preview.detail);
  const sections = $derived(detail ? facsimileSections(detail, references).slice(0, 2) : []);
  const counts = $derived(
    detail
      ? `${detail.form.totalStudents ?? 0} students · ${detail.form.totalPic ?? 0} personnel in charge`
      : '',
  );
</script>

<aside class="queue-pane" aria-label="Selected report">
  {#if !row}
    <div class="pane-empty">
      <h2>{queueSelectionPrompt(kind)}</h2>
      <p>{QUEUE_SELECTION_HINT}</p>
    </div>
  {:else}
    <header class="pane-head">
      <p class="reference mono">{row.trackingNumber ?? 'No tracking number'}</p>
      <h2>{row.title}</h2>
      <StatusBadge status={row.status} />

      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd>{row.typeLabel}</dd>
        </div>
        <div>
          <dt>College</dt>
          <dd>{row.college}</dd>
        </div>
        <div>
          <dt>{queueWaitingHeading(kind)}</dt>
          <dd>{row.waitingDate}</dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd class:is-attention={row.ageAttention}>
            {row.ageLabel}{row.ageAttention ? ' — attention' : ''}
          </dd>
        </div>
      </dl>

      {#if actions}
        {@render actions()}
      {/if}
    </header>

    <div class="pane-body">
      {#if preview.loading}
        <div class="summary-skeleton" aria-busy="true">
          <span class="sr-only">Loading the report summary</span>
          {#each [64, 88, 72, 80, 56] as width, index (index)}
            <div class="skeleton line" style="width: {width}%"></div>
          {/each}
        </div>
      {:else if preview.error}
        <div class="pane-error" role="alert">
          <p>
            <AlertCircle size={16} aria-hidden="true" />
            <span>The report summary did not load.</span>
          </p>
          <button class="btn btn-outline" type="button" onclick={onretry}>Retry</button>
          <a class="pane-link" href={row.href}>Open the report page</a>
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

        <p class="counts">{counts}</p>
        <a class="btn btn-outline open-full" href={row.href}>Open full report</a>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .queue-pane {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 200px);
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
  }

  .facts {
    display: grid;
    gap: 8px 16px;
    grid-template-columns: 1fr 1fr;
    margin: 4px 0 8px;
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

  .facts dd.is-attention {
    color: var(--warning-700);
    font-weight: 500;
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

  .counts {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
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
    color: var(--status-danger-fg);
    display: flex;
    font-size: 13px;
    gap: 6px;
    margin: 0;
  }

  .pane-link {
    font-size: 12px;
  }

  .summary-skeleton {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .line {
    height: 10px;
  }

  .sr-only {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

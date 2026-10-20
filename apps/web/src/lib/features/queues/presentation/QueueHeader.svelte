<script lang="ts">
  import type { QueueKind } from '@par/shared';

  import { queueSummary, queueTitle } from '../application/queue-rows';

  /** Queue name and the one-line backlog summary (UI spec §7.9). */
  let { kind, total, oldestAgeDays }: { kind: QueueKind; total: number; oldestAgeDays: number } =
    $props();

  const summary = $derived(queueSummary(total, oldestAgeDays));
</script>

<header class="page-head">
  <h1>{queueTitle(kind)}</h1>

  {#if summary}
    <p class="summary" class:is-attention={summary.attention}>
      <span>{summary.count}</span>
      <span class="separator" aria-hidden="true">·</span>
      <span>{summary.age}{summary.attention ? ' — attention' : ''}</span>
    </p>
  {/if}
</header>

<style>
  .page-head {
    align-items: baseline;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .summary {
    color: var(--text-secondary);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  /* Attention is text as well as color (UI spec §4.2). */
  .summary.is-attention {
    color: var(--warning-700);
    font-weight: 500;
  }

  .separator {
    color: var(--text-disabled);
    padding: 0 4px;
  }
</style>

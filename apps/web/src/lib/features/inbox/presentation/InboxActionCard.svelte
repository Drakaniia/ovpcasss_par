<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';

  import type { InboxRow as InboxRowModel } from '../application/inbox-view';
  import InboxRow from './InboxRow.svelte';

  let {
    id,
    title,
    count,
    href,
    linkLabel,
    rows = [],
    lead = false,
    onresend,
  }: {
    id: string;
    title: string;
    count: number;
    href: string;
    linkLabel: string;
    rows?: InboxRowModel[];
    /** The first card on the page carries the work; the rest stay quiet. */
    lead?: boolean;
    onresend?: (row: InboxRowModel) => void;
  } = $props();
</script>

<section class="card action-card" class:lead aria-labelledby={`inbox-${id}`}>
  <header class="head" class:with-rows={rows.length > 0}>
    <div class="title-group">
      <h3 id={`inbox-${id}`}>{title}</h3>
      <span class="count" data-count={count}>{count}</span>
    </div>
    <a class="link" {href}>
      {linkLabel}
      <ArrowRight size={14} aria-hidden="true" />
    </a>
  </header>

  {#if rows.length > 0}
    <ul class="rows">
      {#each rows as row (row.id)}
        <InboxRow {row} {onresend} />
      {/each}
    </ul>
  {/if}
</section>

<style>
  .action-card {
    overflow: hidden;
  }

  /* The work card reads as paper stock; the supporting cards stay plain white. */
  .lead .head {
    background: var(--surface-paper);
  }

  .head {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    min-height: 48px;
    padding: 8px 18px;
  }

  .head.with-rows {
    border-bottom: 1px solid var(--border);
  }

  .title-group {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  h3 {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .count {
    background: var(--primary-subtle);
    border-radius: 999px;
    color: var(--primary);
    flex: none;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    min-width: 24px;
    padding: 1px 8px;
    text-align: center;
  }

  .link {
    align-items: center;
    display: inline-flex;
    flex: none;
    font-size: 12.5px;
    gap: 5px;
    min-height: 32px;
  }

  .rows {
    margin: 0;
    padding: 0;
  }
</style>

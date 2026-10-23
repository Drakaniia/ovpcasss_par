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
    onresend,
  }: {
    id: string;
    title: string;
    count: number;
    href: string;
    linkLabel: string;
    rows?: InboxRowModel[];
    onresend?: (row: InboxRowModel) => void;
  } = $props();
</script>

<section class="card action-card" aria-labelledby={`inbox-${id}`}>
  <header class="head" class:with-rows={rows.length > 0}>
    <h3 id={`inbox-${id}`}>
      {title}
      <span class="count">({count})</span>
    </h3>
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

  .head {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 10px 16px;
  }

  .head.with-rows {
    border-bottom: 1px solid var(--border);
  }

  h3 {
    font-size: 14px;
    margin: 0;
  }

  .count {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
  }

  .link {
    align-items: center;
    display: inline-flex;
    flex: none;
    font-size: 13px;
    gap: 6px;
    min-height: 32px;
  }

  .rows {
    margin: 0;
    padding: 0;
  }
</style>

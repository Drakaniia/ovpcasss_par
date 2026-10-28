<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';

  import type { ActivityRow } from '../application/inbox-view';

  let {
    title,
    rows,
    href,
    linkLabel,
  }: {
    title: string;
    rows: ActivityRow[];
    href?: string;
    linkLabel?: string;
  } = $props();

  /** Two of these can share the page, so each heading gets its own id. */
  const panelId = $derived(`inbox-activity-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
</script>

<section class="card group" aria-labelledby={panelId}>
  <header class="head">
    <h2 id={panelId}>{title}</h2>
    {#if href && linkLabel}
      <a class="link" {href}>
        {linkLabel}
        <ArrowRight size={14} aria-hidden="true" />
      </a>
    {/if}
  </header>

  <ul class="activity-list">
    {#each rows as row (row.id)}
      <li class="activity-item">
        <p class="activity-text">
          {#if row.prefix}{row.prefix}{/if}
          <a href={row.href} title={row.exact}>{row.label}</a>
          {#if row.suffix}{row.suffix}{/if}
        </p>
        <span class="activity-time" title={row.exact}>{row.relative}</span>
      </li>
    {/each}
  </ul>
</section>

<style>
  .group {
    overflow: hidden;
  }

  .head {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    min-height: 44px;
    padding: 8px 18px;
  }

  h2 {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.005em;
    margin: 0;
  }

  .link {
    align-items: center;
    display: inline-flex;
    flex: none;
    font-size: 12.5px;
    gap: 5px;
    min-height: 32px;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0 18px 12px;
  }

  .activity-item {
    align-items: baseline;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 8px 0;
  }

  .activity-text {
    font-size: 12.5px;
    line-height: 1.45;
    margin: 0;
    min-width: 0;
  }

  .activity-time {
    color: var(--text-secondary);
    flex: none;
    font-size: 11.5px;
    white-space: nowrap;
  }
</style>

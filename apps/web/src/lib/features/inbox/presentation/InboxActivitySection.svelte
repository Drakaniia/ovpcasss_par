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
</script>

<section class="group" aria-labelledby="inbox-activity">
  <header class="head">
    <h2 id="inbox-activity">{title}</h2>
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
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    align-items: baseline;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .link {
    align-items: center;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    min-height: 32px;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .activity-item {
    align-items: baseline;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    min-height: 24px;
  }

  .activity-text {
    font-size: 13px;
    margin: 0;
  }

  .activity-time {
    color: var(--text-secondary);
    flex: none;
    font-size: 12px;
  }
</style>

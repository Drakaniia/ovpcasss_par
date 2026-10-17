<script lang="ts">
  import type { InboxRow as InboxRowModel } from '../application/inbox-view';

  let { row }: { row: InboxRowModel } = $props();
</script>

<li class="row-item">
  <a class="row" href={row.href}>
    <span class="tracking mono">{row.trackingNumber ?? '—'}</span>
    <span class="title">{row.title}</span>
    <span class="meta">{row.meta}</span>
  </a>
</li>

<style>
  .row-item {
    list-style: none;
  }

  .row {
    align-items: center;
    border-top: 1px solid var(--border);
    color: var(--text-primary);
    display: grid;
    gap: 16px;
    grid-template-columns: 128px minmax(0, 1fr) minmax(0, auto);
    min-height: 40px;
    padding: 6px 16px;
    transition: background-color 120ms ease;
  }

  .row:hover {
    background: var(--row-hover);
    text-decoration: none;
  }

  .row:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .tracking {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    color: var(--text-secondary);
    font-size: 12px;
    max-width: 460px;
    text-align: right;
  }

  @media (max-width: 1279px) {
    .meta {
      max-width: 300px;
    }
  }
</style>

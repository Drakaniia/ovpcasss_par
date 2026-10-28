<script lang="ts">
  import { RefreshCw } from '@lucide/svelte';

  import type { InboxRow as InboxRowModel } from '../application/inbox-view';

  let {
    row,
    onresend,
  }: {
    row: InboxRowModel;
    onresend?: (row: InboxRowModel) => void;
  } = $props();
</script>

<li class="row-item">
  <div class="row">
    <a class="row-link" href={row.href}>
      <span class="reference mono">{row.referenceNo}</span>
      <span class="title-text">{row.title}</span>
      <span class="meta">{row.meta}</span>
    </a>

    {#if row.overdue}
      <span class="overdue">Overdue</span>
    {/if}

    {#if row.canResend && onresend}
      <button
        class="resend"
        type="button"
        aria-label="Resend invitation for {row.referenceNo}"
        onclick={() => onresend(row)}
      >
        <RefreshCw size={13} aria-hidden="true" /> Resend
      </button>
    {/if}
  </div>
</li>

<style>
  .row-item {
    list-style: none;
  }

  .row {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    min-height: 40px;
    padding-right: 18px;
  }

  .row-item:first-child .row {
    border-top: 0;
  }

  .row-link {
    align-items: baseline;
    color: var(--text-primary);
    display: grid;
    flex: 1;
    gap: 16px;
    grid-template-columns: 112px minmax(0, 1fr) minmax(0, auto);
    min-height: 40px;
    min-width: 0;
    padding: 6px 0 6px 18px;
  }

  .row-link:hover {
    background: var(--row-hover);
    text-decoration: none;
  }

  .row-link:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .reference {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-text {
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    color: var(--text-secondary);
    font-size: 11.5px;
    max-width: 460px;
    text-align: right;
  }

  /* Attention, not alarm: gold is the office's "look here" accent. */
  .overdue {
    background: var(--status-gold-bg);
    border-radius: var(--radius-badge);
    color: var(--status-gold-fg);
    flex: none;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
  }

  .resend {
    align-items: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    font-size: 12px;
    gap: 5px;
    min-height: 26px;
    padding: 0 8px;
    transition:
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .resend:hover {
    background: var(--surface-page);
    border-color: color-mix(in srgb, var(--text-primary) 22%, var(--border));
    color: var(--text-primary);
  }

  @media (max-width: 1279px) {
    .meta {
      max-width: 300px;
    }
  }
</style>

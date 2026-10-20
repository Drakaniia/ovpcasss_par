<script lang="ts">
  import { NOTIFICATION_KIND_LABELS, type Notification } from '@par/shared';

  import { formatDateTime } from '$lib/format/datetime';
  import { notificationHref, notificationTimeLabel } from '../application/notification-view';

  /**
   * One inbox row (phase 11 §2). The whole row is the link; the unread marker is
   * a dot plus a label for assistive technology, never colour alone.
   */
  let {
    item,
    now,
    onopen,
  }: { item: Notification; now: Date; onopen: (item: Notification) => void } = $props();

  const href = $derived(notificationHref(item.target));
  const timeLabel = $derived(notificationTimeLabel(item.createdAt, now));
  const exact = $derived(formatDateTime(item.createdAt));
  const unread = $derived(item.readAt === null);
</script>

<li class="row" class:is-unread={unread}>
  <a class="row-link" {href} onclick={() => onopen(item)}>
    <span class="dot" aria-hidden="true"></span>
    {#if unread}
      <span class="sr-only">Unread.</span>
    {/if}

    <span class="body">
      <span class="headline">
        <span class="description">{item.description}</span>
        <span class="chip">{NOTIFICATION_KIND_LABELS[item.kind]}</span>
        <time class="time" datetime={item.createdAt} title={exact}>{timeLabel}</time>
      </span>

      {#if item.comment}
        <span class="comment">{item.comment}</span>
      {/if}
    </span>
  </a>
</li>

<style>
  .row {
    border-bottom: 1px solid var(--border);
    list-style: none;
  }

  .row:last-child {
    border-bottom: 0;
  }

  .row-link {
    align-items: start;
    color: var(--text-primary);
    display: grid;
    gap: 4px 10px;
    grid-template-columns: 8px 1fr;
    padding: 10px 16px;
  }

  .row-link:hover {
    background: var(--row-hover);
    text-decoration: none;
  }

  .dot {
    border: 1px solid var(--text-disabled);
    border-radius: 50%;
    height: 8px;
    margin-top: 6px;
    width: 8px;
  }

  .is-unread .dot {
    background: var(--primary);
    border-color: var(--primary);
  }

  .body {
    display: block;
    min-width: 0;
  }

  .headline {
    align-items: baseline;
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr auto 72px;
  }

  .description {
    font-size: 13px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .is-unread .description {
    font-weight: 600;
  }

  .chip {
    background: var(--status-neutral-bg);
    border-radius: var(--radius-badge);
    color: var(--status-neutral-fg);
    font-size: 11px;
    font-weight: 500;
    padding: 2px 6px;
    white-space: nowrap;
  }

  .time {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  .comment {
    color: var(--text-secondary);
    display: -webkit-box;
    font-size: 12px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    margin-top: 2px;
    overflow: hidden;
  }

  @media (max-width: 1279px) {
    .headline {
      grid-template-columns: 1fr auto 64px;
    }
  }
</style>

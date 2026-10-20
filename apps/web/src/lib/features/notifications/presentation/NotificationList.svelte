<script lang="ts">
  import type { Notification } from '@par/shared';

  import type { NotificationDayGroup } from '../application/notification-view';
  import NotificationRow from './NotificationRow.svelte';

  /** Day groups render as one card: Today, Yesterday, then dated groups. */
  let {
    days,
    now,
    onopen,
  }: { days: NotificationDayGroup[]; now: Date; onopen: (item: Notification) => void } = $props();
</script>

<div class="list">
  {#each days as day (day.key)}
    <section class="day" aria-label={day.label}>
      <h2 class="day-label">{day.label}</h2>
      <ul class="rows">
        {#each day.items as item (item.id)}
          <NotificationRow {item} {now} {onopen} />
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .day-label {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0 0 6px 16px;
    text-transform: uppercase;
  }

  .rows {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    margin: 0;
    padding: 0;
  }
</style>

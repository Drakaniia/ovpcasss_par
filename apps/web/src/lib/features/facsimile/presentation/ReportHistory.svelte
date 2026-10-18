<script lang="ts">
  import type { ReportDetail } from '@par/shared';

  import { historyGroups } from '../application/facsimile-history';
  import WorkflowStepper from './WorkflowStepper.svelte';

  /**
   * Full audit timeline below the document (UI spec §7.7): grouped by day,
   * ascending, with actor, role, action, status change, and a comment excerpt.
   * The latest event carries a "Current" marker. Read-only; the composer lives
   * in the decision drawer.
   *
   * Below 1280 px the stepper moves into this panel, so it is never rendered in
   * two places at once.
   */
  let { detail }: { detail: ReportDetail } = $props();

  const groups = $derived(historyGroups(detail.history ?? []));
  const total = $derived((detail.history ?? []).length);
</script>

<section class="report-history" aria-labelledby="history-heading">
  <div class="history-stepper">
    <WorkflowStepper status={detail.status} />
  </div>

  <header class="history-head">
    <h2 id="history-heading">History</h2>
    {#if total > 0}
      <span class="history-count">{total} {total === 1 ? 'event' : 'events'}</span>
    {/if}
  </header>

  {#if groups.length === 0}
    <p class="empty">No events yet.</p>
  {:else}
    <div class="days">
      {#each groups as group (group.day)}
        <section class="history-day" aria-label={group.day}>
          <h3>{group.day}</h3>
          <ol>
            {#each group.entries as entry (entry.id)}
              <li class="entry" class:is-current={entry.current}>
                <span class="marker" aria-hidden="true"></span>
                <time class="time">{entry.time}</time>

                <div class="entry-body">
                  <p class="entry-line">
                    <span class="action">{entry.action}</span>
                    by {entry.actorName}
                    <span class="role">({entry.roleLabel})</span>
                    {#if entry.current}
                      <span class="current-chip">Current</span>
                    {/if}
                  </p>

                  {#if entry.statusChange}
                    <p class="status-change">Status: {entry.statusChange}</p>
                  {/if}

                  {#if entry.comment}
                    <p class="comment-excerpt">{entry.comment}</p>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .report-history {
    margin-top: 32px;
    max-width: 820px;
  }

  .history-stepper {
    display: none;
    margin-bottom: 20px;
  }

  .history-head {
    align-items: baseline;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  h2 {
    font-size: 16px;
    margin: 0;
  }

  .history-count {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .days {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .history-day h3 {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .entry {
    display: grid;
    gap: 2px 10px;
    grid-template-columns: 10px 52px minmax(0, 1fr);
    padding: 0 0 14px;
    position: relative;
  }

  .entry:last-child {
    padding-bottom: 0;
  }

  /* A hairline connects the day's markers; it stops at the last event. */
  .entry::before {
    background: var(--border);
    content: '';
    left: 4px;
    position: absolute;
    top: 14px;
    bottom: 0;
    width: 1px;
  }

  .entry:last-child::before {
    display: none;
  }

  .marker {
    background: var(--surface-card);
    border: 1.5px solid var(--border);
    border-radius: 50%;
    height: 9px;
    margin-top: 5px;
    position: relative;
    width: 9px;
    z-index: 1;
  }

  .entry.is-current .marker {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-subtle);
  }

  .time {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    padding-top: 3px;
  }

  .entry-body {
    min-width: 0;
  }

  .entry-line {
    font-size: 13px;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .action {
    font-weight: 500;
  }

  .role {
    color: var(--text-secondary);
  }

  .current-chip {
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-left: 6px;
    padding: 1px 5px;
    text-transform: uppercase;
    vertical-align: 1px;
  }

  .status-change {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .comment-excerpt {
    border-left: 2px solid var(--border);
    color: var(--text-secondary);
    font-size: 12.5px;
    line-height: 1.5;
    margin: 6px 0 0;
    padding-left: 8px;
    overflow-wrap: anywhere;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  @media (max-width: 1279px) {
    .history-stepper {
      display: block;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marker {
      box-shadow: none;
    }
  }
</style>

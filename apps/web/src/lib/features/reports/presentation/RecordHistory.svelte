<script lang="ts">
  import type { ReportHistoryEvent } from '@par/shared';

  import { formatDateTime } from '$lib/format/datetime';
  import { ROLE_LABELS } from '$lib/navigation/navigation';

  const ACTION_LABELS: Record<string, string> = {
    RECORD_CREATED: 'Record created',
    RECORD_UPDATED: 'Details updated',
    RECORD_COMPLETED_DATE_SET: 'Date completed updated',
    RECORD_DELETED: 'Record deleted',
    RECORD_RENUMBERED: 'AR No. renumbered',
    NARRATIVE_SAVED: 'Narrative draft saved',
    NARRATIVE_SUBMITTED: 'Narrative submitted',
    NARRATIVE_RETURNED: 'Returned for revision',
    NARRATIVE_APPROVED: 'Narrative approved',
    SIGNATURE_ATTACHED: 'Signature added',
    RECEIPT_ISSUED: 'Receipt issued',
    RECEIPT_DOWNLOADED: 'Receipt downloaded',
    INVITATION_RESENT: 'Invitation sent again',
    PIC_ASSIGNED: 'Personnel in charge added',
    PIC_REMOVED: 'Personnel in charge removed',
  };

  let { history }: { history: readonly ReportHistoryEvent[] } = $props();

  function label(action: string): string {
    return ACTION_LABELS[action] ?? action;
  }
</script>

<section class="history" aria-labelledby="history-title">
  <h2 id="history-title">History</h2>

  {#if history.length === 0}
    <p class="empty">No events yet.</p>
  {:else}
    <ol class="history-list">
      {#each [...history].reverse() as event (event.id ?? `${event.at}-${event.action}`)}
        <li class="history-row">
          <p class="event">{label(event.action)}</p>
          <p class="event-meta">
            {event.actorName} · {ROLE_LABELS[event.actorRole]} · {formatDateTime(event.at)}
          </p>
          {#if event.comment}
            <p class="event-comment">{event.comment}</p>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .history {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .history-list {
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 12px;
    list-style: none;
    margin: 0;
    padding: 0 0 0 12px;
  }

  .history-row {
    position: relative;
  }

  .history-row::before {
    background: var(--border);
    border-radius: 50%;
    content: '';
    height: 6px;
    left: -15px;
    position: absolute;
    top: 5px;
    width: 6px;
  }

  .event {
    font-size: 12px;
    margin: 0;
  }

  .event-meta {
    color: var(--text-secondary);
    font-size: 11px;
    margin: 1px 0 0;
  }

  .event-comment {
    background: var(--surface-page);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 11px;
    margin: 4px 0 0;
    padding: 4px 6px;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }
</style>

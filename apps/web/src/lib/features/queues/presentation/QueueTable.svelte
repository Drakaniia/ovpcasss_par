<script lang="ts">
  import type { QueueKind } from '@par/shared';

  import StatusBadge from '$lib/components/StatusBadge.svelte';

  import type { QueueRow } from '../application/queue-rows';
  import { queueTitle, queueWaitingHeading } from '../application/queue-rows';

  /**
   * The backlog table (UI spec §7.9). A row selects the preview pane at
   * ≥1440 px and opens the report below it; the page decides which.
   */
  let {
    rows,
    kind,
    selectedId = null,
    leavingId = null,
    onrow,
  }: {
    rows: QueueRow[];
    kind: QueueKind;
    selectedId?: string | null;
    leavingId?: string | null;
    onrow: (row: QueueRow) => void;
  } = $props();

  const waitingHeading = $derived(queueWaitingHeading(kind));

  function onkey(event: KeyboardEvent, row: QueueRow) {
    if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
    event.preventDefault();
    onrow(row);
  }
</script>

<div class="table-scroll queue-scroll">
  <table class="data-table queue-table" aria-label={queueTitle(kind)}>
    <caption class="visually-hidden">
      {queueTitle(kind)}, {queueWaitingHeading(kind).toLowerCase()} date and working-day age
    </caption>

    <thead>
      <tr>
        <th scope="col" class="col-tracking">Tracking no.</th>
        <th scope="col" class="col-title">Title</th>
        <th scope="col" class="col-type">Type</th>
        <th scope="col" class="col-college">College</th>
        <th scope="col" class="col-waiting">{waitingHeading}</th>
        <th scope="col" class="col-age">Age</th>
        <th scope="col">Status</th>
      </tr>
    </thead>

    <tbody>
      {#each rows as row (row.id)}
        <tr
          id="queue-row-{row.id}"
          tabindex="0"
          aria-selected={selectedId === row.id}
          class:is-leaving={leavingId === row.id}
          onclick={() => onrow(row)}
          onkeydown={(event) => onkey(event, row)}
        >
          <td class="mono col-tracking">
            <span class="tracking-value">{row.trackingNumber ?? '—'}</span>
          </td>

          <td class="col-title">
            <span class="title-text" title={row.title}>{row.title}</span>
          </td>

          <td class="col-type type">{row.typeLabel}</td>

          <td class="col-college type" title={row.college}>{row.college}</td>

          <td class="mono col-waiting" title={row.waitingExact}>{row.waitingDate}</td>

          <td class="col-age">
            <span class="age" class:is-attention={row.ageAttention}>
              {row.ageLabel}{row.ageAttention ? ' — attention' : ''}
            </span>
          </td>

          <td><StatusBadge status={row.status} /></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .queue-scroll {
    max-height: calc(100vh - 320px);
    min-height: 160px;
  }

  .col-tracking {
    min-width: 190px;
  }

  .tracking-value {
    color: var(--text-secondary);
  }

  .col-title {
    min-width: 200px;
  }

  .title-text {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--text-primary);
    display: -webkit-box;
    font-weight: 500;
    line-clamp: 2;
    line-height: 1.3;
    max-width: 280px;
    overflow: hidden;
  }

  .type {
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .col-college {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-waiting,
  .col-age {
    white-space: nowrap;
  }

  /* Age is text as well as color, so the row reads the same without it. */
  .age {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .age.is-attention {
    color: var(--warning-700);
    font-weight: 500;
  }

  /* The decided row fades out before it leaves the backlog. */
  tbody tr {
    transition: opacity 140ms ease-out;
  }

  tbody tr.is-leaving {
    opacity: 0;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    tbody tr {
      transition: none;
    }
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  /* College hides first, then Type; tracking, title, dates, and status stay. */
  @media (max-width: 1439px) {
    .col-college {
      display: none;
    }
  }

  @media (max-width: 1279px) {
    .col-type {
      display: none;
    }
  }
</style>

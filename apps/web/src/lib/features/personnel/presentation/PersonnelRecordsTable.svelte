<script lang="ts">
  import type { MyReceipt } from '@par/shared';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { ChevronRight, Receipt as ReceiptIcon } from '@lucide/svelte';

  import type { PersonnelRow } from '../application/personnel-records';

  let {
    rows,
    caption = 'Registered activities and their status',
    receipts,
    flush = false,
    onreceipt,
    onopen,
  }: {
    rows: readonly PersonnelRow[];
    caption?: string;
    /** The reader's own receipt for a record, keyed by report id. */
    receipts?: ReadonlyMap<string, MyReceipt>;
    /** Set when the table sits inside its own panel, which already draws the border. */
    flush?: boolean;
    onreceipt?: (receipt: MyReceipt) => void;
    /** Opens the activity preview; the explicit row action still navigates. */
    onopen?: (row: PersonnelRow) => void;
  } = $props();
</script>

<div class="table-scroll" class:flush>
  <table class="data-table">
    <caption class="visually-hidden">{caption}</caption>
    <thead>
      <tr>
        <th scope="col">AR No.</th>
        <th scope="col">Activity</th>
        <th scope="col">Dates</th>
        <th scope="col">Location</th>
        <th scope="col">Status</th>
        <th scope="col" class="actions-head"><span class="visually-hidden">Action</span></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        {@const receipt = receipts?.get(row.id)}
        <tr class="record-row">
          <td class="reference-cell">
            <span class="reference">{row.referenceNo}</span>
          </td>
          <td class="activity-cell">
            <button class="title" type="button" onclick={() => onopen?.(row)}>{row.title}</button>
            <p class="meta">{row.meta}</p>
          </td>
          <td class="dates-cell">{row.dates}</td>
          <td class="location-cell table-col-secondary">{row.location}</td>
          <td class="status-cell">
            <StatusBadge status={row.status} />
            {#if row.archived}<span class="archived-chip">Archived</span>{/if}
          </td>
          <td class="actions-cell">
            <div class="row-end">
              {#if receipt}
                <button
                  class="btn btn-outline btn-sm receipt-action"
                  type="button"
                  onclick={() => onreceipt?.(receipt)}
                >
                  <ReceiptIcon size={14} aria-hidden="true" />
                  Receipt
                </button>
              {/if}
              <a class="row-action" href={row.action.href}>
                {row.action.label}
                <ChevronRight size={14} aria-hidden="true" />
              </a>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* Inside a panel the panel draws the edge; the table stops competing with it. */
  .flush {
    border: 0;
    border-radius: 0;
  }

  /*
   * The row is the target: the title button's overlay fills the row, so a click
   * anywhere opens the preview dialog (report 4) and the row keeps one tab stop
   * for that purpose. The explicit row action stays a real link above it.
   */
  .record-row {
    position: relative;
  }

  .record-row .title::after {
    content: '';
    inset: 0;
    position: absolute;
  }

  .record-row .title {
    background: none;
    border: 0;
    color: var(--text-primary);
    cursor: pointer;
    display: inline;
    font: inherit;
    font-weight: 500;
    padding: 0;
    text-align: left;
  }

  .record-row .title:hover {
    text-decoration: underline;
  }

  /* The row's own controls sit above the overlay so their own action wins. */
  .record-row .row-end {
    align-items: center;
    display: inline-flex;
    gap: 10px;
    position: relative;
    z-index: 1;
  }

  .receipt-action {
    align-items: center;
    display: inline-flex;
    flex: none;
    gap: 6px;
  }

  .reference {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .activity-cell {
    max-width: 380px;
  }

  .meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .dates-cell,
  .location-cell {
    color: var(--text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }

  .location-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .archived-chip {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-secondary);
    display: inline-block;
    font-size: 10px;
    margin-left: 6px;
    padding: 1px 6px;
    vertical-align: middle;
  }

  .actions-head,
  .actions-cell {
    text-align: right;
    width: 1%;
  }

  .row-action {
    align-items: center;
    display: inline-flex;
    font-size: 12px;
    gap: 2px;
    white-space: nowrap;
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

  /*
   * Below 1024 px (2026-11-01) six columns cannot be read at any width a phone
   * has, so each row restacks into the card it already is: reference and status
   * on the leading line, the activity next, the dates and place under it, and
   * the row's own controls at the end. The header row stays in the document for
   * a screen reader and leaves the view with the clip technique, so the table
   * keeps the column headers that give each cell its name.
   */
  @media (max-width: 1023px) {
    .table-scroll,
    .table-scroll.flush {
      background: transparent;
      border: 0;
      border-radius: 0;
      overflow: visible;
    }

    .data-table,
    .data-table tbody {
      display: block;
    }

    /* The cards carry the edge; the list keeps its distance from the panel. */
    .data-table {
      padding: 10px;
    }

    .data-table thead {
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      height: 1px;
      overflow: hidden;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    .data-table tbody tr {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      column-gap: 12px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      margin: 0 0 10px;
      padding: 12px 14px;
      row-gap: 2px;
    }

    .data-table tbody tr:last-child {
      margin-bottom: 0;
    }

    .data-table tbody td {
      border-bottom: 0;
      height: auto;
      min-width: 0;
      padding: 0;
    }

    .reference-cell {
      align-self: center;
      grid-column: 1;
      grid-row: 1;
    }

    .status-cell {
      align-self: center;
      grid-column: 2;
      grid-row: 1;
      text-align: right;
    }

    .activity-cell {
      grid-column: 1 / -1;
      grid-row: 2;
      max-width: none;
      padding-top: 4px;
    }

    .dates-cell {
      grid-column: 1;
      grid-row: 3;
      white-space: normal;
    }

    /* The office list drops Location below 1280 px; a card has the room. */
    .data-table tbody td.table-col-secondary {
      display: block;
    }

    .location-cell {
      grid-column: 2;
      grid-row: 3;
      max-width: 46vw;
      overflow: visible;
      text-align: right;
      white-space: normal;
    }

    .actions-cell {
      grid-column: 1 / -1;
      grid-row: 4;
      justify-self: start;
      padding-top: 8px;
      text-align: left;
      width: auto;
    }

    .actions-head {
      display: none;
    }

    .row-end {
      gap: 8px;
    }
  }

  @media (max-width: 639px) {
    .data-table tbody tr {
      padding: 10px 12px;
    }

    .activity-cell .title {
      font-size: 14px;
      line-height: 1.35;
    }

    .location-cell {
      max-width: 40vw;
    }

    .row-end {
      flex-wrap: wrap;
      row-gap: 6px;
    }
  }
</style>

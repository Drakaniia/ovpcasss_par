<script lang="ts">
  import type { MyReceipt } from '@par/shared';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { ChevronRight, Receipt as ReceiptIcon } from '@lucide/svelte';

  import type { PersonnelRow } from '../application/personnel-records';

  let {
    rows,
    caption = 'Registered activities and their status',
    receipts,
    onreceipt,
  }: {
    rows: readonly PersonnelRow[];
    caption?: string;
    /** The reader's own receipt for a record, keyed by report id. */
    receipts?: ReadonlyMap<string, MyReceipt>;
    onreceipt?: (receipt: MyReceipt) => void;
  } = $props();
</script>

<div class="table-scroll">
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
            <a class="reference" href={row.href}>{row.referenceNo}</a>
          </td>
          <td class="activity-cell">
            <a class="title" href={row.href}>{row.title}</a>
            <p class="meta">{row.meta}</p>
          </td>
          <td class="dates-cell">{row.dates}</td>
          <td class="location-cell table-col-secondary">{row.location}</td>
          <td>
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
  /*
   * The row is the target, not just the title: the title link's overlay fills
   * the row, so a click anywhere opens the record with native link behaviour
   * (keyboard, middle-click, context menu) and one tab stop per row.
   */
  .record-row {
    position: relative;
  }

  .record-row .title::after {
    content: '';
    inset: 0;
    position: absolute;
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
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .activity-cell {
    max-width: 380px;
  }

  .title {
    color: var(--text-primary);
    font-weight: 500;
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
</style>

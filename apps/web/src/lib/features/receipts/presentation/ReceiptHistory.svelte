<script lang="ts">
  import type { MyReceipt } from '@par/shared';
  import { Download, Eye } from '@lucide/svelte';

  import { formatLongDate } from '$lib/format/datetime';
  import { toast } from '$lib/toast/toast.svelte';

  import { downloadReceipt } from '../application/receipt-file';
  import ReceiptPreview from './ReceiptPreview.svelte';

  /**
   * The receipts issued to one account, across activities (spec §10). A PIC who
   * was never named on a record claims it by submitting, and its receipt lands
   * here once the office approves.
   */
  let { receipts }: { receipts: readonly MyReceipt[] } = $props();

  let downloading = $state<string | null>(null);
  let previewing = $state<{ reportId: string; receipt: MyReceipt } | null>(null);

  async function download(receipt: MyReceipt): Promise<void> {
    if (downloading) return;
    downloading = receipt.id;

    try {
      await downloadReceipt(receipt.reportId, receipt);
    } catch {
      toast.error('The receipt could not be downloaded. Try again.');
    } finally {
      downloading = null;
    }
  }
</script>

<section class="card receipts" aria-labelledby="receipt-history-title">
  <header class="receipts-head">
    <h2 id="receipt-history-title">Acknowledgment receipts</h2>
    <p class="lede">OVPCASSS-F-013, one for each approved activity you reported on.</p>
  </header>

  {#if receipts.length === 0}
    <p class="empty">
      A receipt appears here when the office approves an activity you reported on.
    </p>
  {:else}
    <ul class="receipt-list">
      {#each receipts as receipt (receipt.id)}
        <li class="receipt-row">
          <p class="receipt-title">
            <span class="reference">{receipt.referenceNo}</span>
            {receipt.title}
          </p>
          <p class="receipt-meta">
            Issued {formatLongDate(receipt.generatedAt)}
            {#if receipt.emailedAt}
              · mailed {formatLongDate(receipt.emailedAt)}
            {/if}
          </p>
          <div class="receipt-actions">
            <button
              class="btn btn-outline btn-sm"
              type="button"
              onclick={() => (previewing = { reportId: receipt.reportId, receipt })}
            >
              <Eye size={14} aria-hidden="true" />
              Preview
            </button>
            <button
              class="btn btn-outline btn-sm"
              type="button"
              disabled={downloading !== null}
              onclick={() => void download(receipt)}
            >
              <Download size={14} aria-hidden="true" />
              {downloading === receipt.id ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if previewing}
    <ReceiptPreview
      reportId={previewing.reportId}
      receipt={previewing.receipt}
      onclose={() => (previewing = null)}
    />
  {/if}
</section>

<style>
  .receipts {
    overflow: hidden;
  }

  .receipts-head {
    border-bottom: 1px solid var(--border);
    padding: 14px 16px 12px;
  }

  h2 {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
    margin: 4px 0 0;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 12.5px;
    line-height: 1.5;
    margin: 0;
    padding: 14px 16px;
  }

  .receipt-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .receipt-row {
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 12px 16px;
  }

  .receipt-row:first-child {
    border-top: 0;
  }

  .receipt-title {
    font-size: 13px;
    line-height: 1.4;
    margin: 0;
  }

  .reference {
    color: var(--text-secondary);
    display: block;
    font-family: var(--font-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .receipt-meta {
    color: var(--text-secondary);
    font-size: 11.5px;
    margin: 0;
  }

  .receipt-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .btn {
    align-items: center;
    display: inline-flex;
    flex: none;
    gap: 6px;
  }
</style>

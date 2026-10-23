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

<section class="receipts" aria-labelledby="receipt-history-title">
  <div class="receipts-head">
    <h2 id="receipt-history-title">Acknowledgment receipts</h2>
    <p class="lede">OVPCASSS-F-013, one for each approved activity you reported on.</p>
  </div>

  {#if receipts.length === 0}
    <p class="empty">
      A receipt appears here when the office approves an activity you reported on.
    </p>
  {:else}
    <ul class="receipt-list">
      {#each receipts as receipt (receipt.id)}
        <li class="receipt-row">
          <div class="receipt-body">
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
          </div>
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
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .receipts-head {
    align-items: baseline;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    text-align: right;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .receipt-list {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .receipt-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 10px 12px;
  }

  .receipt-row:last-child {
    border-bottom: 0;
  }

  .receipt-title {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }

  .reference {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin-right: 8px;
  }

  .receipt-meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .receipt-actions {
    display: flex;
    flex: none;
    gap: 8px;
  }

  .btn {
    align-items: center;
    display: inline-flex;
    flex: none;
    gap: 6px;
  }
</style>

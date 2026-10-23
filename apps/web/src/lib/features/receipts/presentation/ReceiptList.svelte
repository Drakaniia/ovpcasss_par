<script lang="ts">
  import type { ReportReceipt } from '@par/shared';
  import { Download } from '@lucide/svelte';

  import { apiDownload, saveBlob } from '$lib/api/http';
  import { formatLongDate } from '$lib/format/datetime';
  import { toast } from '$lib/toast/toast.svelte';

  /**
   * OVPCASSS-F-013 receipts, one per person in charge (spec §10). Issued at
   * approval, mailed as a PDF, and kept downloadable forever after.
   */
  let {
    reportId,
    receipts,
  }: {
    reportId: string;
    receipts: readonly ReportReceipt[];
  } = $props();

  let downloading = $state<string | null>(null);

  async function download(receipt: ReportReceipt): Promise<void> {
    if (downloading) return;
    downloading = receipt.id;

    try {
      const blob = await apiDownload(`/reports/${reportId}/receipts/${receipt.id}/file`);
      saveBlob(
        blob,
        `OVPCASSS-F-013-${receipt.recipientName.replaceAll(/[^0-9A-Za-z]+/g, '-')}.pdf`,
      );
    } catch {
      toast.error('The receipt could not be downloaded. Try again.');
    } finally {
      downloading = null;
    }
  }
</script>

<section class="receipts" aria-labelledby="receipts-title">
  <div class="receipts-head">
    <h2 id="receipts-title">Acknowledgment receipts</h2>
    <p class="lede">OVPCASSS-F-013, one for each person in charge.</p>
  </div>

  <ul class="receipt-list">
    {#each receipts as receipt (receipt.id)}
      <li class="receipt-row">
        <div class="receipt-body">
          <p class="recipient">{receipt.recipientName}</p>
          <p class="receipt-meta">
            Issued {formatLongDate(receipt.generatedAt)}
            {#if receipt.emailedAt}
              · mailed {formatLongDate(receipt.emailedAt)}
            {/if}
          </p>
        </div>
        <button
          class="btn btn-outline btn-sm"
          type="button"
          disabled={downloading !== null}
          onclick={() => void download(receipt)}
        >
          <Download size={14} aria-hidden="true" />
          {downloading === receipt.id ? 'Downloading…' : 'Download PDF'}
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .receipts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h2 {
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 12px;
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

  .recipient {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }

  .receipt-meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .btn {
    align-items: center;
    display: inline-flex;
    flex: none;
    gap: 6px;
  }
</style>

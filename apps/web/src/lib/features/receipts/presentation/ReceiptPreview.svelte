<script lang="ts">
  import type { ReportReceipt } from '@par/shared';
  import { Download, X } from '@lucide/svelte';

  import { apiDownload, saveBlob } from '$lib/api/http';
  import { toast } from '$lib/toast/toast.svelte';

  /**
   * OVPCASSS-F-013 in a dialog before it leaves the app (spec §10). The PDF is
   * fetched as a blob and shown in a frame, so the same bytes that print are the
   * ones the download saves; a bearer-token client fetches them the same way.
   *
   * The parent mounts this only for a selected receipt, so a closed dialog is
   * never in the page at all.
   */
  let {
    reportId,
    receipt,
    onclose,
  }: {
    reportId: string;
    receipt: ReportReceipt;
    onclose: () => void;
  } = $props();

  const titleId = $props.id();
  const filename = $derived(
    `OVPCASSS-F-013-${receipt.recipientName.replaceAll(/[^0-9A-Za-z]+/g, '-')}.pdf`,
  );

  let dialog = $state<HTMLDialogElement | null>(null);
  let url = $state<string | null>(null);
  let loading = $state(true);
  let failed = $state(false);
  let file = $state<Blob | null>(null);

  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal();
  });

  $effect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const blob = await apiDownload(`/reports/${reportId}/receipts/${receipt.id}/file`);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        url = objectUrl;
        file = blob;
      } catch {
        if (!cancelled) failed = true;
      } finally {
        if (!cancelled) loading = false;
      }
    })();

    // A blob URL outlives the dialog unless it is revoked on the way out.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });

  function download(): void {
    if (!file) return;
    try {
      saveBlob(file, filename);
    } catch {
      toast.error('The receipt could not be saved. Try again.');
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog receipt-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    onclose();
  }}
  onclick={(event) => {
    // A modal click on the backdrop targets the dialog element itself.
    if (event.target === event.currentTarget) onclose();
  }}
  {onclose}
>
  <header class="receipt-head">
    <div class="receipt-identity">
      <h2 id={titleId} class="dialog-title">Acknowledgment receipt</h2>
      <p class="receipt-for">OVPCASSS-F-013&ensp;·&ensp;{receipt.recipientName}</p>
    </div>
    <div class="receipt-actions">
      <button class="btn btn-primary btn-sm" type="button" disabled={!file} onclick={download}>
        <Download size={15} aria-hidden="true" />
        Download PDF
      </button>
      <button class="receipt-close" type="button" aria-label="Close" onclick={onclose}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  </header>

  <div class="receipt-stage">
    {#if loading}
      <p class="receipt-note">Preparing the receipt…</p>
    {:else if failed}
      <p class="receipt-note">The receipt could not be prepared. Close this and try again.</p>
    {:else if url}
      <iframe
        class="receipt-frame"
        src={url}
        title={`OVPCASSS-F-013 receipt for ${receipt.recipientName}`}
      ></iframe>
    {/if}
  </div>
</dialog>

<style>
  /* An author `display` beats the UA's `dialog:not([open]) { display: none }`. */
  .receipt-dialog:not([open]) {
    display: none;
  }

  .receipt-dialog {
    display: flex;
    flex-direction: column;
    height: min(92dvh, 1040px);
    max-height: calc(100dvh - 48px);
    max-width: 860px;
    overflow: hidden;
    padding: 0;
    width: min(92vw, 860px);
  }

  .receipt-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .receipt-identity {
    min-width: 0;
  }

  .receipt-identity h2 {
    margin: 0;
  }

  .receipt-for {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }

  .receipt-actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: 8px;
  }

  .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .receipt-close {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 32px;
    justify-content: center;
    transition:
      background-color var(--duration-fast) ease,
      transform 100ms ease-out;
    width: 32px;
  }

  .receipt-close:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .receipt-close:active {
    transform: scale(0.94);
  }

  .receipt-stage {
    background: var(--surface-page);
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .receipt-frame {
    border: 0;
    height: 100%;
    width: 100%;
  }

  .receipt-note {
    align-self: center;
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 48px 24px;
    text-align: center;
    width: 100%;
  }
</style>

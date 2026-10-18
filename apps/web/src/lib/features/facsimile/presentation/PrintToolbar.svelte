<script lang="ts">
  import type { ReportStatus } from '@par/shared';
  import { AlertCircle, ArrowLeft, Download, Printer } from '@lucide/svelte';

  import { watermarkNote } from '../application/facsimile-workflow';

  /**
   * Screen-only toolbar for print preview (UI spec §7.8). Print is the single
   * filled action; the download is outline and carries the watermark note.
   * Neither is enabled until the document has finished rendering.
   */
  let {
    id,
    status,
    ready,
    pdfBusy = false,
    pdfError,
    onprint,
    ondownload,
    onretry,
  }: {
    id: string;
    status: ReportStatus;
    ready: boolean;
    pdfBusy?: boolean;
    pdfError?: string;
    onprint: () => void;
    ondownload: () => void;
    onretry: () => void;
  } = $props();

  const note = $derived(watermarkNote(status));
  const preparing = $derived(!ready ? 'Preparing document…' : '');
</script>

<div class="print-toolbar" role="toolbar" aria-label="Print preview">
  <a class="back" href="/reports/{id}">
    <ArrowLeft size={14} aria-hidden="true" />
    Back to record view
  </a>

  <div class="tools">
    <p class="reason" aria-live="polite">
      {#if preparing}
        {preparing}
      {:else if note}
        {note}
      {/if}
    </p>

    <button
      class="btn btn-outline"
      type="button"
      disabled={!ready || pdfBusy}
      aria-describedby="print-reason"
      onclick={ondownload}
    >
      <Download size={14} aria-hidden="true" />
      {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
    </button>

    <button
      class="btn btn-primary"
      type="button"
      disabled={!ready}
      aria-describedby="print-reason"
      onclick={onprint}
    >
      <Printer size={14} aria-hidden="true" />
      Print
    </button>
  </div>

  <span id="print-reason" class="sr-only">{preparing || note || ''}</span>

  {#if pdfError}
    <div class="toolbar-alert" role="alert">
      <AlertCircle size={14} aria-hidden="true" />
      <span>{pdfError}</span>
      <button class="retry" type="button" onclick={onretry}>Retry</button>
    </div>
  {/if}
</div>

<style>
  .print-toolbar {
    align-items: center;
    backdrop-filter: blur(12px) saturate(140%);
    background: color-mix(in srgb, var(--surface-card) 88%, transparent);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: grid;
    gap: 8px 16px;
    grid-template-columns: auto minmax(0, 1fr);
    margin-bottom: 24px;
    padding: 10px 12px;
    position: sticky;
    top: 12px;
    z-index: 20;
  }

  .back {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 13px;
    gap: 4px;
    white-space: nowrap;
  }

  .back:hover {
    color: var(--text-primary);
    text-decoration: none;
  }

  .tools {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .reason {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    max-width: 34ch;
  }

  .toolbar-alert {
    align-items: flex-start;
    color: var(--status-danger-fg);
    display: flex;
    font-size: 12px;
    gap: 6px;
    grid-column: 1 / -1;
    line-height: 1.45;
  }

  .retry {
    background: transparent;
    color: inherit;
    font-weight: 500;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .print-toolbar {
      backdrop-filter: none;
      background: var(--surface-card);
    }
  }
</style>

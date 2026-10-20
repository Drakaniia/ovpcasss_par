<script lang="ts">
  import type { MonitoringPreviewSheet } from '@par/shared';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { lockScroll, unlockScroll } from '$lib/a11y/scroll-lock';

  import ExportWorkbookSheet from './ExportWorkbookSheet.svelte';

  /**
   * Review the workbook before it is written (phase 14 §4, revised): the sheet
   * that will be exported, with the same rows the preview shows, and the
   * explicit warning when unapproved reports are included.
   */
  let {
    open = $bindable(false),
    sheet,
    termLabel,
    includeInProgress = false,
    downloading = false,
    ondownload,
  }: {
    open?: boolean;
    sheet: MonitoringPreviewSheet;
    termLabel: string;
    includeInProgress?: boolean;
    downloading?: boolean;
    ondownload: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let cancelButton = $state<HTMLButtonElement | null>(null);
  let body = $state<HTMLDivElement | null>(null);

  const inProgressCount = $derived(sheet.inProgressCount);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelButton?.focus();
      // Always start at A1 rather than wherever the last review was scrolled.
      body?.querySelector<HTMLElement>('.grid-scroll')?.scrollTo({ left: 0, top: 0 });
    }
    if (!open && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  });

  function requestClose() {
    if (downloading) return;
    open = false;
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog preview-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    requestClose();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <header class="preview-head">
    <h2 class="dialog-title" id={titleId}>Review the workbook</h2>
    <p class="preview-lede">{sheet.sheetName} · {termLabel}</p>
    {#if includeInProgress && inProgressCount > 0}
      <p class="caution">
        This workbook includes {inProgressCount}
        {inProgressCount === 1 ? 'report' : 'reports'} that are not yet approved. Date Completed will
        be blank for those rows.
      </p>
    {/if}
    {#if sheet.missingCount > 0}
      <p class="note">
        {sheet.missingCount}
        {sheet.missingCount === 1 ? 'report' : 'reports'} will export with blank fields; the preview above
        the button lists each one.
      </p>
    {/if}
  </header>

  <div class="preview-body" bind:this={body}>
    <ExportWorkbookSheet {sheet} />
  </div>

  <div class="dialog-actions">
    <button class="btn btn-outline" type="button" bind:this={cancelButton} onclick={requestClose}>
      Cancel
    </button>
    <button class="btn btn-primary" type="button" onclick={ondownload} disabled={downloading}>
      {downloading ? 'Preparing…' : 'Download .xlsx'}
    </button>
  </div>
</dialog>

<style>
  /*
   * Only style the open dialog; a closed one must keep the UA `display: none`.
   * The sheet is 18 columns wide, so the review surface takes the viewport
   * rather than a 960px card.
   */
  .preview-dialog[open] {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 32px);
    max-width: none;
    overflow: hidden;
    padding: 20px 24px;
    width: min(1680px, calc(100vw - 32px));
  }

  .preview-head,
  .dialog-actions {
    flex: 0 0 auto;
  }

  .preview-lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .caution {
    background: var(--status-gold-bg);
    border-radius: var(--radius-card);
    color: var(--status-gold-fg);
    font-size: 12px;
    margin: 12px 0 0;
    padding: 8px 10px;
  }

  .note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 8px 0 0;
  }

  .preview-body {
    flex: 0 1 auto;
    margin-top: 12px;
    min-height: 0;
    overflow: hidden;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  }
</style>

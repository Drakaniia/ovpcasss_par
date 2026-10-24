<script lang="ts">
  import type { Attachment } from '@par/shared';
  import { Download, X } from '@lucide/svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { saveBlob } from '$lib/api/http';

  import { attachmentTypeLabel } from '../application/attachment-preview';

  /**
   * The full-size view of one attachment (report 12). The parent already holds
   * the bytes as a blob — the image was fetched through the session, not by an
   * `<img src>` — so Download saves exactly what is on screen.
   */
  let {
    attachment,
    blob,
    src,
    onclose,
  }: {
    attachment: Attachment;
    blob: Blob;
    src: string;
    onclose: () => void;
  } = $props();

  const titleId = $props.id();
  const metaId = `${titleId}-meta`;

  let dialog = $state<HTMLDialogElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let failed = $state(false);

  $effect(() => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    closeButton?.focus();
  });

  function download(): void {
    saveBlob(blob, attachment.originalName);
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog preview-dialog"
  aria-labelledby={titleId}
  aria-describedby={metaId}
  oncancel={(event) => {
    event.preventDefault();
    onclose();
  }}
  onclick={(event) => {
    // A modal click on the backdrop targets the dialog element itself.
    if (event.target === event.currentTarget) onclose();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  {onclose}
>
  <header class="preview-head">
    <div class="preview-identity">
      <h2 id={titleId} class="dialog-title">Attachment preview</h2>
      <p class="preview-name">{attachment.label || attachment.originalName}</p>
      <p class="preview-meta" id={metaId}>
        {attachmentTypeLabel(attachment)} · {attachment.originalName}
      </p>
    </div>

    <div class="preview-actions">
      <button class="btn btn-outline btn-sm" type="button" onclick={download}>
        <Download size={15} aria-hidden="true" /> Download
      </button>
      <button
        class="preview-close"
        type="button"
        aria-label="Close preview"
        bind:this={closeButton}
        onclick={onclose}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  </header>

  <div class="preview-stage">
    {#if failed}
      <p class="preview-note">The image could not be displayed. Download the file instead.</p>
    {:else}
      <img
        class="preview-image"
        {src}
        alt={`Full-size preview of ${attachment.originalName}`}
        onerror={() => (failed = true)}
      />
    {/if}
  </div>
</dialog>

<style>
  /* An author `display` beats the UA's `dialog:not([open]) { display: none }`. */
  .preview-dialog:not([open]) {
    display: none;
  }

  .preview-dialog {
    display: flex;
    flex-direction: column;
    height: min(92dvh, 960px);
    max-height: calc(100dvh - 48px);
    max-width: 1040px;
    overflow: hidden;
    padding: 0;
    width: min(92vw, 1040px);
  }

  .preview-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 16px 20px;
  }

  .preview-identity {
    min-width: 0;
  }

  .preview-identity h2 {
    margin: 0;
  }

  .preview-name {
    font-size: 13px;
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }

  .preview-meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
    overflow-wrap: anywhere;
  }

  .preview-actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: 8px;
  }

  .preview-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .preview-close {
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

  .preview-close:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .preview-close:active {
    transform: scale(0.94);
  }

  .preview-stage {
    align-items: center;
    background: var(--surface-page);
    display: flex;
    flex: 1;
    justify-content: center;
    min-height: 0;
    overflow: auto;
    padding: 20px;
  }

  .preview-image {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: block;
    height: auto;
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
  }

  .preview-note {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 48px 24px;
    text-align: center;
  }
</style>

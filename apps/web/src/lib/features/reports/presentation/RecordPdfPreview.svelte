<script lang="ts">
  import { Download, X } from '@lucide/svelte';

  import { apiDownload, saveBlob } from '$lib/api/http';
  import { toast } from '$lib/toast/toast.svelte';

  /**
   * The office facsimile PDF (spec §7.8) in a dialog before it leaves the app.
   * The bytes come from the authenticated file endpoint and render from a blob
   * URL: the shell's `frame-src blob:` CSP allows it, and a bearer-token client
   * previews the same file the download saves.
   *
   * The parent mounts this only for an open preview, so a closed dialog is never
   * in the page at all.
   */
  let {
    reportId,
    referenceNo,
    onclose,
  }: {
    reportId: string;
    referenceNo: string;
    onclose: () => void;
  } = $props();

  const titleId = $props.id();
  const filename = $derived(`${referenceNo.replaceAll(/[^0-9A-Za-z]+/g, '-')}.pdf`);

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
        const blob = await apiDownload(`/reports/${reportId}/pdf/file`);
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
      toast.error('The PDF could not be saved. Try again.');
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog pdf-dialog"
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
  <header class="pdf-head">
    <div class="pdf-identity">
      <h2 id={titleId} class="dialog-title">Report facsimile</h2>
      <p class="pdf-for">{referenceNo}&ensp;·&ensp;PDF preview</p>
    </div>
    <div class="pdf-actions">
      <button class="btn btn-primary btn-sm" type="button" disabled={!file} onclick={download}>
        <Download size={15} aria-hidden="true" />
        Download PDF
      </button>
      <button class="pdf-close" type="button" aria-label="Close" onclick={onclose}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  </header>

  <div class="pdf-stage">
    {#if loading}
      <p class="pdf-note">Preparing the record…</p>
    {:else if failed}
      <p class="pdf-note">The PDF could not be prepared. Close this and try again.</p>
    {:else if url}
      <iframe class="pdf-frame" src={url} title={`${referenceNo} facsimile PDF`}></iframe>
    {/if}
  </div>
</dialog>

<style>
  /* An author `display` beats the UA's `dialog:not([open]) { display: none }`. */
  .pdf-dialog:not([open]) {
    display: none;
  }

  .pdf-dialog {
    display: flex;
    flex-direction: column;
    height: min(92dvh, 1040px);
    max-height: calc(100dvh - 48px);
    max-width: 860px;
    overflow: hidden;
    padding: 0;
    width: min(92vw, 860px);
  }

  .pdf-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .pdf-identity {
    min-width: 0;
  }

  .pdf-identity h2 {
    margin: 0;
  }

  .pdf-for {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }

  .pdf-actions {
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

  .pdf-close {
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

  .pdf-close:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .pdf-close:active {
    transform: scale(0.94);
  }

  .pdf-stage {
    background: var(--surface-page);
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .pdf-frame {
    border: 0;
    height: 100%;
    width: 100%;
  }

  .pdf-note {
    align-self: center;
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 48px 24px;
    text-align: center;
    width: 100%;
  }
</style>

<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

  import TabIndicator from '$lib/components/TabIndicator.svelte';

  import {
    SIGNATURE_ACCEPT,
    SIGNATURE_LIMIT_LABEL,
    readSignatureFile,
  } from '../application/signature-image';
  import SignatureCanvas from './SignatureCanvas.svelte';

  type Tab = 'draw' | 'upload';

  /**
   * The Draw and Upload tabs of the signature card (UI spec §7.14). The picked
   * or drawn image is published upward; the card owns saving it.
   */
  let { onchange }: { onchange: (dataUrl: string | null) => void } = $props();

  let tab = $state<Tab>('draw');
  let uploadError = $state<string | null>(null);
  /** The panel that comes in only fades in once a tab has been picked. */
  let switched = $state(false);

  /** The last processed upload, so the card can report and undo the cleanup. */
  let upload = $state<{
    dataUrl: string;
    background: 'removed' | 'kept';
    original: string;
  } | null>(null);
  let showingOriginal = $state(false);

  let tabRow: HTMLElement | undefined = $state();

  function select(next: Tab) {
    if (next === tab) return;
    tab = next;
    switched = true;
  }

  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadError = null;
    const result = await readSignatureFile(file);
    // The same file must be selectable again after a rejection.
    input.value = '';

    if (!result.ok) {
      uploadError = result.error;
      return;
    }

    upload = {
      dataUrl: result.image.image,
      background: result.background,
      original: result.original.image,
    };
    showingOriginal = false;
    onchange(result.image.image);
  }

  /** Restores the untouched upload while it is still pending. */
  function useOriginal() {
    if (!upload) return;
    showingOriginal = true;
    onchange(upload.original);
  }

  function useProcessed() {
    if (!upload) return;
    showingOriginal = false;
    onchange(upload.dataUrl);
  }
</script>

<div class="tabs" role="tablist" aria-label="Signature capture" bind:this={tabRow}>
  <button
    class="tab"
    data-tab-key="draw"
    class:is-active={tab === 'draw'}
    type="button"
    role="tab"
    aria-selected={tab === 'draw'}
    tabindex={tab === 'draw' ? 0 : -1}
    onclick={() => select('draw')}
  >
    Draw
  </button>
  <button
    class="tab"
    data-tab-key="upload"
    class:is-active={tab === 'upload'}
    type="button"
    role="tab"
    aria-selected={tab === 'upload'}
    tabindex={tab === 'upload' ? 0 : -1}
    onclick={() => select('upload')}
  >
    Upload
  </button>
  <TabIndicator row={tabRow} active={tab} />
</div>

<!-- Both panels stay mounted: switching tabs must not discard a drawing. -->
<div
  class="panel"
  role="tabpanel"
  hidden={tab !== 'draw'}
  class:entering={switched && tab === 'draw'}
>
  <SignatureCanvas {onchange} />
</div>

<div
  class="panel"
  role="tabpanel"
  hidden={tab !== 'upload'}
  class:entering={switched && tab === 'upload'}
>
  <div class="field">
    <label class="field-label" for="signature-file">Image file</label>
    <input
      class="input"
      id="signature-file"
      type="file"
      accept={SIGNATURE_ACCEPT}
      aria-describedby="signature-file-hint"
      onchange={pick}
    />
    <p class="field-hint" id="signature-file-hint">
      PNG or JPEG under {SIGNATURE_LIMIT_LABEL}. A photo of paper works: the background is removed
      automatically.
    </p>

    {#if upload}
      <div class="upload-preview">
        <img
          class="preview sheet"
          class:is-original={showingOriginal}
          src={showingOriginal ? upload.original : upload.dataUrl}
          alt="Uploaded signature preview"
        />
        <p class="preview-status" role="status">
          {#if showingOriginal}
            Using the original image. It will print as it appears here.
          {:else if upload.background === 'removed'}
            Background removed. Transparent areas print as paper.
          {:else}
            Background kept — this image is not dark ink on a light background.
          {/if}
        </p>
        {#if upload.background === 'removed'}
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            onclick={showingOriginal ? useProcessed : useOriginal}
          >
            {showingOriginal ? 'Use cleaned image' : 'Use original'}
          </button>
        {/if}
      </div>
    {/if}
    {#if uploadError}
      <p class="field-error">
        <AlertCircle size={16} aria-hidden="true" />
        {uploadError}
      </p>
    {/if}
  </div>
</div>

<style>
  .tabs {
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    position: relative;
  }

  .tab {
    background: transparent;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: 13px;
    min-height: 32px;
    padding: 0 12px;
    transition:
      background-color var(--duration-fast) var(--ease-standard),
      color var(--duration-fast) var(--ease-standard);
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.is-active {
    color: var(--text-primary);
    font-weight: 500;
  }

  .panel {
    margin-bottom: 16px;
  }

  .upload-preview {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }

  /* The checkerboard makes the transparency visible, not implied. */
  .preview {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: block;
    height: auto;
    max-width: 320px;
    padding: 4px;
    width: 100%;
  }

  .preview.is-original {
    background: var(--surface-card);
  }

  .sheet {
    background-color: var(--signature-checker-a);
    background-image:
      linear-gradient(
        45deg,
        var(--signature-checker-b) 25%,
        transparent 25%,
        transparent 75%,
        var(--signature-checker-b) 75%
      ),
      linear-gradient(
        45deg,
        var(--signature-checker-b) 25%,
        transparent 25%,
        transparent 75%,
        var(--signature-checker-b) 75%
      );
    background-position:
      0 0,
      8px 8px;
    background-size: 16px 16px;
  }

  .preview-status {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    max-width: 52ch;
  }

  /* The panel that comes in settles instead of blinking into place. */
  .panel.entering {
    animation: panel-enter var(--duration-base) var(--ease-standard);
  }

  @keyframes panel-enter {
    from {
      opacity: 0;
      transform: translateY(var(--panel-shift, 4px));
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel.entering {
      --panel-shift: 0px;
      animation-duration: var(--duration-fast);
    }
  }
</style>

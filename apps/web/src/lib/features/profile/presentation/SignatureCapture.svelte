<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

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

    onchange(result.image.image);
  }
</script>

<div class="tabs" role="tablist" aria-label="Signature capture">
  <button
    class="tab"
    class:is-active={tab === 'draw'}
    type="button"
    role="tab"
    aria-selected={tab === 'draw'}
    tabindex={tab === 'draw' ? 0 : -1}
    onclick={() => (tab = 'draw')}
  >
    Draw
  </button>
  <button
    class="tab"
    class:is-active={tab === 'upload'}
    type="button"
    role="tab"
    aria-selected={tab === 'upload'}
    tabindex={tab === 'upload' ? 0 : -1}
    onclick={() => (tab = 'upload')}
  >
    Upload
  </button>
</div>

<!-- Both panels stay mounted: switching tabs must not discard a drawing. -->
<div class="panel" role="tabpanel" hidden={tab !== 'draw'}>
  <SignatureCanvas {onchange} />
</div>

<div class="panel" role="tabpanel" hidden={tab !== 'upload'}>
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
      PNG or JPEG under {SIGNATURE_LIMIT_LABEL}. A transparent background is preferred.
    </p>
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
  }

  .tab {
    background: transparent;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: 13px;
    min-height: 32px;
    padding: 0 12px;
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.is-active {
    border-bottom-color: var(--primary);
    color: var(--text-primary);
    font-weight: 500;
  }

  .panel {
    margin-bottom: 16px;
  }
</style>

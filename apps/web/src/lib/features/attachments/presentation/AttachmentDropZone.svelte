<script lang="ts">
  import { AlertCircle, UploadCloud } from '@lucide/svelte';

  import {
    ACCEPT_ATTRIBUTE,
    MAX_FILE_SIZE_LABEL,
    type FileRejection,
  } from '../application/attachment-rules';

  /**
   * The uploader's drop target and picker trigger. The parent decides whether
   * "Choose files" opens the browser input or the desktop dialog, so this
   * component stays identical in both shells.
   */
  let {
    disabled = false,
    rejections = [],
    onfiles,
    onchoose,
  }: {
    disabled?: boolean;
    rejections?: FileRejection[];
    onfiles: (files: FileList | readonly File[]) => void;
    onchoose: (openInput: () => void) => void;
  } = $props();

  let dragging = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    dragging = false;
    if (disabled) return;
    if (event.dataTransfer?.files) onfiles(event.dataTransfer.files);
  }

  function onFileInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    if (target.files) onfiles(target.files);
    target.value = '';
  }
</script>

<div
  class="drop-zone"
  class:is-dragging={dragging}
  class:is-disabled={disabled}
  role="group"
  aria-label="Attachment upload"
  ondragover={(event) => {
    event.preventDefault();
    if (!disabled) dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={onDrop}
>
  <span class="drop-icon" aria-hidden="true"><UploadCloud size={22} /></span>
  <div class="drop-copy">
    <p class="drop-title">Drop files here or choose files.</p>
    <p class="drop-hint">
      PDF or image. {MAX_FILE_SIZE_LABEL} per file.
    </p>
  </div>
  <button
    class="btn btn-outline"
    type="button"
    {disabled}
    onclick={() => {
      if (!disabled) onchoose(() => input?.click());
    }}
  >
    Choose files
  </button>
  <input
    class="visually-hidden"
    type="file"
    multiple
    accept={ACCEPT_ATTRIBUTE}
    tabindex="-1"
    bind:this={input}
    onchange={onFileInput}
  />
</div>

{#if rejections.length > 0}
  <ul class="rejections" role="alert">
    {#each rejections as rejection (rejection.name)}
      <li>
        <AlertCircle size={16} aria-hidden="true" />
        <span>{rejection.message}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .drop-zone {
    align-items: center;
    background: var(--surface-page);
    border: 1px dashed var(--border);
    border-radius: var(--radius-card);
    display: flex;
    gap: 12px;
    padding: 16px;
    transition:
      background 120ms ease,
      border-color 120ms ease;
  }

  .drop-zone.is-dragging {
    background: var(--primary-subtle);
    border-color: var(--primary);
  }

  .drop-zone.is-disabled {
    opacity: 0.7;
  }

  .drop-icon {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 40px;
    justify-content: center;
    width: 40px;
  }

  .drop-copy {
    flex: 1;
    min-width: 0;
  }

  .drop-title {
    font-size: 13px;
    margin: 0;
  }

  .drop-hint {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .rejections {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    flex-direction: column;
    font-size: 12px;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 10px 12px;
  }

  .rejections li {
    align-items: flex-start;
    display: flex;
    gap: 6px;
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

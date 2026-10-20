<script lang="ts">
  import {
    Download,
    Eye,
    File as FileIcon,
    FileArchive,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    Presentation,
    RotateCw,
    Trash2,
  } from '@lucide/svelte';

  import {
    fileKind,
    formatFileSize,
    isPreviewable,
    type AttachmentKind,
  } from '../application/attachment-rules';
  import type { AttachmentItem } from '../application/attachment-items';
  import AttachmentStatusChip from './AttachmentStatusChip.svelte';

  /**
   * Attachment rows (UI spec §8.5): file icon, name, size, label select, status
   * chip, progress, and the actions for that state. Failed rows offer Retry.
   */
  let {
    items,
    labelOptions,
    disabled = false,
    onlabel,
    onretry,
    onremove,
    onpreview,
  }: {
    items: AttachmentItem[];
    labelOptions: readonly string[];
    disabled?: boolean;
    onlabel: (key: string, label: string) => void;
    onretry: (key: string) => void;
    onremove: (key: string) => void;
    onpreview: (key: string) => void;
  } = $props();

  const ICONS: Record<AttachmentKind, typeof FileIcon> = {
    pdf: FileText,
    image: ImageIcon,
    word: FileText,
    excel: FileSpreadsheet,
    powerpoint: Presentation,
    archive: FileArchive,
    text: FileText,
    other: FileIcon,
  };

  function iconFor(fileName: string) {
    return ICONS[fileKind(fileName)];
  }
</script>

<ul class="attachment-list">
  {#each items as item (item.key)}
    {@const Icon = iconFor(item.fileName)}
    <li class="attachment-row">
      <span class="file-icon" aria-hidden="true">
        <Icon size={18} />
      </span>

      <div class="file-body">
        <p class="file-name" title={item.fileName}>{item.fileName}</p>
        <p class="file-meta">
          <span class="size">{formatFileSize(item.size)}</span>
          {#if item.error}
            <span class="file-error">{item.error}</span>
          {/if}
        </p>
        {#if item.status === 'UPLOADING'}
          <div
            class="progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={item.progress}
            aria-label="Upload progress for {item.fileName}"
          >
            <span style="width: {item.progress}%"></span>
          </div>
        {/if}
      </div>

      <div class="label-cell">
        {#if labelOptions.length > 0}
          <select
            class="select label-select"
            aria-label="Label for {item.fileName}"
            value={item.label}
            disabled={disabled || item.status === 'UPLOADING'}
            onchange={(event) => onlabel(item.key, event.currentTarget.value)}
          >
            <option value="">Unlabelled</option>
            {#each labelOptions as label (label)}
              <option value={label}>{label}</option>
            {/each}
          </select>
        {:else}
          <span class="muted">Unlabelled</span>
        {/if}
      </div>

      <div class="status-cell">
        <AttachmentStatusChip status={item.status} />
      </div>

      <div class="row-actions">
        {#if item.status === 'CONFIRMED'}
          <button
            class="icon-action"
            type="button"
            aria-label="{isPreviewable(item.fileName) ? 'Preview' : 'Download'} {item.fileName}"
            onclick={() => onpreview(item.key)}
          >
            {#if isPreviewable(item.fileName)}
              <Eye size={16} aria-hidden="true" />
            {:else}
              <Download size={16} aria-hidden="true" />
            {/if}
          </button>
        {/if}

        {#if item.status === 'FAILED'}
          <button
            class="icon-action"
            type="button"
            {disabled}
            aria-label="Retry {item.fileName}"
            onclick={() => onretry(item.key)}
          >
            <RotateCw size={16} aria-hidden="true" />
          </button>
        {/if}

        <button
          class="icon-action remove"
          type="button"
          {disabled}
          aria-label="Remove {item.fileName}"
          onclick={() => onremove(item.key)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  {/each}
</ul>

<style>
  .attachment-list {
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .attachment-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: grid;
    gap: 12px;
    grid-template-columns: 28px minmax(0, 1fr) 168px auto auto;
    min-height: 56px;
    padding: 8px 0;
  }

  .attachment-row:last-child {
    border-bottom: 0;
  }

  .file-icon {
    color: var(--text-secondary);
    display: inline-flex;
    justify-content: center;
  }

  .file-body {
    min-width: 0;
  }

  .file-name {
    font-size: 13px;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta {
    color: var(--text-secondary);
    display: flex;
    font-size: 12px;
    gap: 8px;
    margin: 2px 0 0;
  }

  .size {
    font-variant-numeric: tabular-nums;
  }

  .file-error {
    color: var(--status-danger-fg);
  }

  .progress {
    background: var(--border);
    border-radius: 999px;
    height: 4px;
    margin-top: 6px;
    overflow: hidden;
  }

  .progress span {
    background: var(--primary);
    display: block;
    height: 100%;
    transition: width 120ms linear;
  }

  .label-select {
    font-size: 12px;
    min-height: 30px;
  }

  .muted {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .row-actions {
    display: flex;
    gap: 4px;
  }

  .icon-action {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .icon-action:hover:not(:disabled) {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .icon-action.remove:hover:not(:disabled) {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .status-cell {
    align-items: center;
    display: flex;
  }

  /* Narrow: three tracks over two rows. The label moves under the file name so
     the row never has to fit five tracks, which is what pushed the chip and the
     actions over each other (UI spec §8.5). */
  @media (max-width: 1279px) {
    .attachment-row {
      grid-template-columns: 28px minmax(0, 1fr) auto;
    }

    .file-icon {
      grid-area: 1 / 1;
    }

    .file-body {
      grid-area: 1 / 2;
    }

    .status-cell {
      grid-area: 1 / 3;
    }

    .label-cell {
      grid-area: 2 / 2;
    }

    .row-actions {
      grid-area: 2 / 3;
    }
  }
</style>

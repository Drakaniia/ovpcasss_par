<script lang="ts">
  import type { Attachment } from '@par/shared';
  import {
    Download,
    ExternalLink,
    File as FileIcon,
    FileArchive,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    Presentation,
  } from '@lucide/svelte';
  import { onDestroy, onMount } from 'svelte';

  import { apiDownload, saveBlob } from '$lib/api/http';
  import { toast } from '$lib/toast/toast.svelte';

  import { fileKind, formatFileSize, type AttachmentKind } from '../application/attachment-rules';
  import {
    attachmentFilePath,
    attachmentTypeLabel,
    previewKind,
  } from '../application/attachment-preview';
  import RecordAttachmentDialog from './RecordAttachmentDialog.svelte';

  /**
   * Submitted attachments with a visual preview (report 12). Bytes are fetched
   * through the session with `apiDownload` — an `<img src>` cannot carry the
   * desktop bearer token — and only the first few images are fetched up front,
   * so a record with many files still opens quickly. Every object URL is
   * revoked when the page leaves.
   */
  const THUMBNAIL_LIMIT = 12;

  let {
    reportId,
    attachments,
  }: {
    reportId: string;
    attachments: readonly Attachment[];
  } = $props();

  const headingId = $props.id();

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

  type Preview = { url: string; blob: Blob };

  let previews = $state<Record<string, Preview>>({});
  let previewing = $state<{ attachment: Attachment; preview: Preview } | null>(null);
  let busyId = $state<string | null>(null);
  let disposed = false;

  /** Every object URL this component made, revoked together on destroy. */
  const created: string[] = [];

  const thumbnails = $derived(
    attachments
      .filter(
        (attachment) => attachment.status === 'CONFIRMED' && previewKind(attachment) === 'image',
      )
      .slice(0, THUMBNAIL_LIMIT),
  );

  function iconFor(attachment: Attachment) {
    return ICONS[fileKind(attachment.originalName)];
  }

  async function ensurePreview(attachment: Attachment): Promise<Preview | null> {
    const existing = previews[attachment.id];
    if (existing) return existing;

    try {
      const blob = await apiDownload(attachmentFilePath(reportId, attachment.id));
      if (disposed) return null;

      const url = URL.createObjectURL(blob);
      created.push(url);
      const preview = { url, blob };
      previews = { ...previews, [attachment.id]: preview };
      return preview;
    } catch {
      toast.error('The attachment could not be opened. Try again.');
      return null;
    }
  }

  async function openPreview(attachment: Attachment): Promise<void> {
    if (busyId) return;
    busyId = attachment.id;

    try {
      const preview = await ensurePreview(attachment);
      if (preview) previewing = { attachment, preview };
    } finally {
      busyId = null;
    }
  }

  async function openInTab(attachment: Attachment): Promise<void> {
    if (busyId) return;
    busyId = attachment.id;

    try {
      const preview = await ensurePreview(attachment);
      if (preview) window.open(preview.url, '_blank', 'noopener,noreferrer');
    } finally {
      busyId = null;
    }
  }

  async function download(attachment: Attachment): Promise<void> {
    if (busyId) return;
    busyId = attachment.id;

    try {
      const blob = await apiDownload(attachmentFilePath(reportId, attachment.id));
      saveBlob(blob, attachment.originalName);
    } catch {
      toast.error('The attachment could not be downloaded. Try again.');
    } finally {
      busyId = null;
    }
  }

  onMount(() => {
    for (const attachment of thumbnails) {
      if (disposed) return;
      void ensurePreview(attachment);
    }
  });

  onDestroy(() => {
    disposed = true;
    for (const url of created) URL.revokeObjectURL(url);
    created.length = 0;
  });
</script>

<section class="record-attachments" aria-labelledby={headingId}>
  <h2 id={headingId}>Attachments</h2>

  {#if attachments.length === 0}
    <p class="empty">No attachments were submitted with this report.</p>
  {:else}
    {#if thumbnails.length > 0}
      <ul class="thumbnails">
        {#each thumbnails as attachment (attachment.id)}
          {@const preview = previews[attachment.id]}
          <li>
            <button
              class="thumb"
              type="button"
              aria-label={`Preview ${attachment.originalName}`}
              disabled={busyId === attachment.id}
              onclick={() => void openPreview(attachment)}
            >
              {#if preview}
                <img
                  class="thumb-image"
                  src={preview.url}
                  alt={`Thumbnail of ${attachment.originalName}`}
                  loading="lazy"
                />
              {:else}
                <span class="thumb-wait" aria-hidden="true"><ImageIcon size={20} /></span>
              {/if}
              <span class="thumb-name">{attachment.label || attachment.originalName}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <ul class="attachment-rows">
      {#each attachments as attachment (attachment.id)}
        {@const Icon = iconFor(attachment)}
        {@const kind = previewKind(attachment)}
        {@const confirmed = attachment.status === 'CONFIRMED'}
        <li class="attachment-row">
          <span class="row-icon" aria-hidden="true"><Icon size={18} /></span>

          <div class="row-body">
            <p class="row-name">{attachment.label || attachment.originalName}</p>
            <p class="row-meta">
              {attachmentTypeLabel(attachment)} · {formatFileSize(attachment.size)}
              {#if !confirmed}<span class="row-state">Pending upload</span>{/if}
            </p>
          </div>

          {#if confirmed}
            <div class="row-actions">
              {#if kind === 'image'}
                <button
                  class="btn btn-outline btn-sm"
                  type="button"
                  disabled={busyId === attachment.id}
                  onclick={() => void openPreview(attachment)}
                >
                  <ImageIcon size={15} aria-hidden="true" /> Preview
                </button>
              {:else if kind === 'pdf'}
                <button
                  class="btn btn-outline btn-sm"
                  type="button"
                  disabled={busyId === attachment.id}
                  onclick={() => void openInTab(attachment)}
                >
                  <ExternalLink size={15} aria-hidden="true" /> Open
                </button>
              {/if}

              <button
                class="btn btn-ghost btn-sm"
                type="button"
                disabled={busyId === attachment.id}
                onclick={() => void download(attachment)}
              >
                <Download size={15} aria-hidden="true" /> Download
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

{#if previewing}
  <RecordAttachmentDialog
    attachment={previewing.attachment}
    blob={previewing.preview.blob}
    src={previewing.preview.url}
    onclose={() => (previewing = null)}
  />
{/if}

<style>
  .record-attachments {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h2 {
    font-size: 13px;
    letter-spacing: 0.02em;
    margin: 0;
    text-transform: uppercase;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .thumbnails {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .thumb {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
    padding: 0 0 8px;
    text-align: left;
    transition:
      border-color var(--duration-fast) ease,
      background-color var(--duration-fast) ease;
    width: 100%;
  }

  .thumb:hover:not(:disabled) {
    background: var(--surface-page);
    border-color: var(--primary);
  }

  .thumb-image,
  .thumb-wait {
    background: var(--surface-page);
    height: 104px;
    width: 100%;
  }

  .thumb-image {
    display: block;
    object-fit: cover;
  }

  .thumb-wait {
    align-items: center;
    color: var(--text-disabled);
    display: flex;
    justify-content: center;
  }

  .thumb-name {
    font-size: 12px;
    overflow: hidden;
    padding: 0 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .attachment-row {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    min-height: 48px;
    padding: 8px 0;
  }

  .attachment-row:first-child {
    border-top: 0;
  }

  .row-icon {
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    justify-content: center;
    width: 24px;
  }

  .row-body {
    min-width: 0;
  }

  .row-name {
    font-size: 13px;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .row-state {
    margin-left: 8px;
  }

  .row-actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: 4px;
    margin-left: auto;
  }

  .row-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 5px;
  }

  @media (prefers-reduced-motion: reduce) {
    .thumb {
      transition: none;
    }
  }
</style>

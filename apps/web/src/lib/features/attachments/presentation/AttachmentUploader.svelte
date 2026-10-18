<script lang="ts">
  import { AlertCircle, UploadCloud } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';

  import { api } from '$lib/api/client';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import {
    ACCEPT_ATTRIBUTE,
    MAX_FILE_SIZE_LABEL,
    isPreviewable,
    validateFiles,
    type FileRejection,
  } from '../application/attachment-rules';
  import { newAttachmentKey, uploadErrorText, type AttachmentItem } from '../application/attachment-items';
  import { uploadToPresignedUrl } from '../application/attachment-upload';
  import AttachmentList from './AttachmentList.svelte';

  /**
   * Attachment uploader (UI spec §8.5). Files go straight to storage through a
   * presigned URL, each with its own progress and status. Submit is blocked by
   * the wizard until every row is Confirmed, not by a modal here.
   */
  let {
    items = $bindable<AttachmentItem[]>([]),
    reportId,
    ensureReportId,
    labelOptions,
    disabled = false,
  }: {
    items?: AttachmentItem[];
    reportId: string | null;
    ensureReportId: () => Promise<string>;
    labelOptions: readonly string[];
    disabled?: boolean;
  } = $props();

  let localReportId = $state<string | null>(untrack(() => reportId));
  let dragging = $state(false);
  let rejections = $state<FileRejection[]>([]);
  let pendingRemove = $state<AttachmentItem | null>(null);
  let confirmOpen = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  const cancels = new SvelteMap<string, () => void>();

  function update(key: string, patch: Partial<AttachmentItem>): void {
    items = items.map((item) => (item.key === key ? { ...item, ...patch } : item));
  }

  function upsert(item: AttachmentItem): void {
    items = items.some((entry) => entry.key === item.key)
      ? items.map((entry) => (entry.key === item.key ? item : entry))
      : [...items, item];
  }

  async function resolveReport(): Promise<string> {
    if (localReportId) return localReportId;
    const id = reportId ?? (await ensureReportId());
    localReportId = id;
    return id;
  }

  function defaultLabel(): string {
    return labelOptions[0] ?? '';
  }

  async function startUpload(file: File, key: string, label: string): Promise<void> {
    const item: AttachmentItem = {
      key,
      id: null,
      fileName: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      label,
      status: 'UPLOADING',
      progress: 0,
      file,
    };
    upsert(item);

    try {
      const id = await resolveReport();
      const presign = await api.attachments.presign(id, {
        fileName: file.name,
        size: file.size,
        mimeType: item.mimeType,
      });
      update(key, { id: presign.attachmentId });

      await uploadToPresignedUrl({
        url: presign.uploadUrl,
        method: presign.method,
        headers: presign.headers,
        file,
        onprogress: (progress) => update(key, { progress }),
        onstart: (cancel) => cancels.set(key, cancel),
      });

      update(key, { status: 'PENDING', progress: 100 });
      const confirmed = await api.attachments.confirm(id, presign.attachmentId, { label });
      update(key, {
        id: confirmed.attachment.id,
        label: confirmed.attachment.label || label,
        status: 'CONFIRMED',
        progress: 100,
      });
    } catch (error) {
      update(key, {
        status: 'FAILED',
        error: uploadErrorText(error, 'The upload did not complete. Try again.'),
      });
    } finally {
      cancels.delete(key);
    }
  }

  function addFiles(fileList: FileList | readonly File[]): void {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const { accepted, rejected } = validateFiles(files);
    rejections = rejected;
    for (const file of accepted) {
      void startUpload(file, newAttachmentKey(), defaultLabel());
    }
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    dragging = false;
    if (disabled) return;
    if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
  }

  function chooseFiles(): void {
    if (disabled) return;
    input?.click();
  }

  function onFileInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    if (target.files) addFiles(target.files);
    target.value = '';
  }

  function retry(key: string): void {
    const item = items.find((entry) => entry.key === key);
    if (!item?.file || disabled) return;
    update(key, { status: 'UPLOADING', progress: 0, error: undefined, id: null });
    void startUpload(item.file, key, item.label || defaultLabel());
  }

  function askRemove(key: string): void {
    const item = items.find((entry) => entry.key === key);
    if (!item) return;

    if (item.status === 'PENDING' || item.status === 'CONFIRMED') {
      pendingRemove = item;
      confirmOpen = true;
      return;
    }

    void removeNow(item);
  }

  async function removeNow(item: AttachmentItem): Promise<void> {
    cancels.get(item.key)?.();

    if (item.id && localReportId) {
      try {
        await api.attachments.remove(localReportId, item.id);
      } catch (error) {
        update(item.key, {
          error: uploadErrorText(error, 'The attachment was not removed. Try again.'),
        });
        return;
      }
    }

    items = items.filter((entry) => entry.key !== item.key);
  }

  async function confirmRemove(): Promise<void> {
    const item = pendingRemove;
    pendingRemove = null;
    if (item) await removeNow(item);
  }

  async function changeLabel(key: string, label: string): Promise<void> {
    const item = items.find((entry) => entry.key === key);
    if (!item) return;
    update(key, { label });

    if (item.status === 'CONFIRMED' && item.id && localReportId) {
      try {
        await api.attachments.confirm(localReportId, item.id, { label });
      } catch (error) {
        update(key, {
          error: uploadErrorText(error, 'The label was not saved. Try again.'),
        });
      }
    }
  }

  async function preview(key: string): Promise<void> {
    const item = items.find((entry) => entry.key === key);
    if (!item?.id || !localReportId) return;

    try {
      const { url } = await api.attachments.url(localReportId, item.id);
      if (isPreviewable(item.fileName)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = item.fileName;
        link.rel = 'noopener';
        link.click();
      }
    } catch (error) {
      toast.error(uploadErrorText(error, 'The file could not be opened. Try again.'));
    }
  }
</script>

<div class="uploader">
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
        PDF, images, Word, Excel, PowerPoint, text, CSV, and archives. {MAX_FILE_SIZE_LABEL} per
        file.
      </p>
    </div>
    <button class="btn btn-outline" type="button" {disabled} onclick={chooseFiles}>
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

  {#if items.length === 0}
    <p class="empty-note">No attachments yet.</p>
  {:else}
    <AttachmentList
      {items}
      {labelOptions}
      {disabled}
      onlabel={(key, label) => void changeLabel(key, label)}
      onretry={retry}
      onremove={askRemove}
      onpreview={(key) => void preview(key)}
    />
  {/if}
</div>

{#if pendingRemove}
  <ConfirmDialog
    bind:open={confirmOpen}
    title="Remove “{pendingRemove.fileName}”?"
    description="The file is removed from this report. This cannot be undone."
    confirmLabel="Remove file"
    tone="destructive"
    onconfirm={() => void confirmRemove()}
    oncancel={() => (pendingRemove = null)}
  />
{/if}

<style>
  .uploader {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

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

  .empty-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
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

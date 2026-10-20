<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';

  import { api } from '$lib/api/client';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { createPlatform } from '$lib/platform';
  import type { PickedFile, Platform } from '$lib/platform/contracts';
  import { toast } from '$lib/toast/toast.svelte';

  import {
    fileError,
    isPreviewable,
    validateFiles,
    type FileRejection,
  } from '../application/attachment-rules';
  import {
    newAttachmentKey,
    uploadErrorText,
    type AttachmentItem,
  } from '../application/attachment-items';
  import { uploadHeaders, uploadToPresignedUrl } from '../application/attachment-upload';
  import AttachmentDropZone from './AttachmentDropZone.svelte';
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
  let rejections = $state<FileRejection[]>([]);
  let pendingRemove = $state<AttachmentItem | null>(null);
  let confirmOpen = $state(false);
  let platform = $state<Platform | null>(null);
  let openingPlatform = false;

  const cancels = new SvelteMap<string, () => void>();

  /** A picked file keeps its disk path on desktop; a dropped one keeps its blob. */
  type UploadSource = {
    name: string;
    size: number;
    mimeType: string;
    file?: File;
    path?: string;
  };

  async function currentPlatform(): Promise<Platform | null> {
    if (platform) return platform;
    if (openingPlatform) return platform;

    openingPlatform = true;
    try {
      platform = await createPlatform();
      return platform;
    } catch {
      return null;
    } finally {
      openingPlatform = false;
    }
  }

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

  async function startUpload(source: UploadSource, key: string, label: string): Promise<void> {
    const item: AttachmentItem = {
      key,
      id: null,
      fileName: source.name,
      size: source.size,
      mimeType: source.mimeType,
      label,
      status: 'UPLOADING',
      progress: 0,
      ...(source.file ? { file: source.file } : {}),
      ...(source.path ? { path: source.path } : {}),
    };
    upsert(item);

    try {
      const id = await resolveReport();
      const presign = await api.attachments.presign(id, {
        fileName: source.name,
        size: source.size,
        mimeType: source.mimeType,
      });
      update(key, { id: presign.attachmentId });
      const headers = uploadHeaders(presign);

      if (source.path) {
        /* Desktop streams from disk; the Tauri adapter is loaded only here. */
        const { uploadFromPath } = await import('$lib/platform/tauri/upload');
        await uploadFromPath({
          url: presign.uploadUrl,
          method: presign.method,
          headers,
          path: source.path,
          uploadId: presign.attachmentId,
          onprogress: (progress) => update(key, { progress }),
        });
      } else if (source.file) {
        await uploadToPresignedUrl({
          url: presign.uploadUrl,
          method: presign.method,
          headers,
          file: source.file,
          // `proxy` means the API stores the file, so the session cookie must go.
          withCredentials: presign.mode === 'proxy',
          onprogress: (progress) => update(key, { progress }),
          onstart: (cancel) => cancels.set(key, cancel),
        });
      } else {
        throw new Error(`${source.name} is no longer available. Choose it again.`);
      }

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
      void startUpload(
        {
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          file,
        },
        newAttachmentKey(),
        defaultLabel(),
      );
    }
  }

  /** Desktop dialog results: size and type are known before any bytes move. */
  function addPicked(files: readonly PickedFile[]): void {
    if (files.length === 0) return;

    const accepted: PickedFile[] = [];
    rejections = [];

    for (const file of files) {
      const message = fileError({ name: file.name, size: file.size, type: file.mimeType });
      if (message) rejections.push({ name: file.name, message });
      else accepted.push(file);
    }

    for (const file of accepted) {
      if (!file.path) {
        rejections.push({ name: file.name, message: 'That file has no readable path.' });
        continue;
      }

      void startUpload(
        {
          name: file.name,
          size: file.size,
          mimeType: file.mimeType || 'application/octet-stream',
          path: file.path,
        },
        newAttachmentKey(),
        defaultLabel(),
      );
    }
  }

  async function chooseFiles(openInput: () => void): Promise<void> {
    if (disabled) return;

    const current = await currentPlatform();
    if (current?.shell !== 'desktop') {
      openInput();
      return;
    }

    try {
      addPicked(await current.files.pick());
    } catch (error) {
      toast.error(uploadErrorText(error, 'The file dialog could not open.'));
    }
  }

  function retry(key: string): void {
    const item = items.find((entry) => entry.key === key);
    if (!item || disabled || (!item.file && !item.path)) return;

    const source: UploadSource = item.file
      ? { name: item.fileName, size: item.size, mimeType: item.mimeType, file: item.file }
      : { name: item.fileName, size: item.size, mimeType: item.mimeType, path: item.path };

    update(key, { status: 'UPLOADING', progress: 0, error: undefined, id: null });
    void startUpload(source, key, item.label || defaultLabel());
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
  <AttachmentDropZone
    {disabled}
    {rejections}
    onfiles={addFiles}
    onchoose={(openInput) => void chooseFiles(openInput)}
  />

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

  .empty-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }
</style>

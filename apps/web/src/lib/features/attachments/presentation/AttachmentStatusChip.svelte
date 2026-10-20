<script lang="ts">
  import { AlertCircle, Check, Clock, UploadCloud } from '@lucide/svelte';

  import {
    statusLabel,
    statusTone,
    type AttachmentUiStatus,
  } from '../application/attachment-rules';

  let { status }: { status: AttachmentUiStatus } = $props();

  const ICONS = {
    UPLOADING: UploadCloud,
    PENDING: Clock,
    CONFIRMED: Check,
    FAILED: AlertCircle,
  } as const;

  const tone = $derived(statusTone(status));
  const Icon = $derived(ICONS[status]);
</script>

<span
  class="status-badge"
  style="--badge-bg: var(--status-{tone}-bg); --badge-fg: var(--status-{tone}-fg)"
>
  <Icon size={14} aria-hidden="true" />
  <span>{statusLabel(status)}</span>
</span>

<style>
  .status-badge {
    align-items: center;
    background: var(--badge-bg);
    border-radius: var(--radius-badge);
    color: var(--badge-fg);
    display: inline-flex;
    font-size: 12px;
    font-weight: 500;
    gap: 6px;
    height: 22px;
    padding: 0 8px;
    white-space: nowrap;
  }
</style>

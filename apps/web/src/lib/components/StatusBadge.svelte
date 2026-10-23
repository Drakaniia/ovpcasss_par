<script lang="ts">
  import type { ReportStatus } from '@par/shared';
  import { Check, Inbox, Pencil, Undo2 } from '@lucide/svelte';

  import { STATUS_PRESENTATION, type StatusIcon } from '$lib/status/report-status';

  let { status }: { status: ReportStatus } = $props();

  const ICONS: Record<StatusIcon, typeof Pencil> = {
    pencil: Pencil,
    inbox: Inbox,
    undo: Undo2,
    check: Check,
  };

  const meta = $derived(STATUS_PRESENTATION[status]);
  const Icon = $derived(ICONS[meta.icon]);
</script>

<span
  class="status-badge"
  style="--badge-bg: var(--status-{meta.tone}-bg); --badge-fg: var(--status-{meta.tone}-fg)"
>
  <Icon size={14} aria-hidden="true" />
  <span>{meta.label}</span>
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

<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { ArrowLeft, Check, Copy } from '@lucide/svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { formatTime } from '$lib/format/datetime';
  import { toast } from '$lib/toast/toast.svelte';

  import {
    formatReturnedDate,
    type ReturnHeader,
    type SaveKind,
  } from '../application/edit-returned';

  let {
    detail,
    returned,
    saveKind,
    saveAt,
    onretry,
  }: {
    detail: ReportDetail;
    returned: ReturnHeader | null;
    saveKind: SaveKind;
    saveAt?: string;
    onretry: () => void;
  } = $props();

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const tracking = $derived(detail.trackingNumber);

  $effect(() => () => clearTimeout(copyTimer));

  async function copyTracking() {
    if (!tracking) return;

    try {
      await navigator.clipboard.writeText(tracking);
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 2000);
    } catch {
      toast.error('The tracking number was not copied. Try again.');
    }
  }
</script>

<header class="page-head">
  <a class="back" href="/reports">
    <ArrowLeft size={14} aria-hidden="true" />
    My reports
  </a>

  <div class="title-row">
    <div class="title-block">
      <div class="tracking">
        {#if tracking}
          <span class="mono">{tracking}</span>
          <button
            class="copy"
            type="button"
            aria-label="Copy tracking number {tracking}"
            onclick={() => void copyTracking()}
          >
            {#if copied}
              <Check size={14} aria-hidden="true" />
            {:else}
              <Copy size={14} aria-hidden="true" />
            {/if}
          </button>
          <span class="sr-only" role="status">{copied ? 'Tracking number copied' : ''}</span>
          <span class="separator" aria-hidden="true">·</span>
        {:else}
          <span class="mono">No tracking number</span>
          <span class="separator" aria-hidden="true">·</span>
        {/if}
        <h1>{detail.form.title}</h1>
      </div>

      {#if returned}
        <p class="return-line">
          Returned by {returned.roleLabel} · {formatReturnedDate(returned.returnedAt)}
        </p>
      {/if}
    </div>

    <div class="head-aside">
      <StatusBadge status={detail.status} />
      <p class="save-status" role="status">
        {#if saveKind === 'saving'}
          Saving…
        {:else if saveKind === 'failed'}
          Not saved —
          <button class="retry" type="button" onclick={onretry}>Retry</button>
        {:else if saveKind === 'local' && saveAt}
          Saved on this device {formatTime(saveAt)}
        {:else if saveKind === 'saved' && saveAt}
          Saved {formatTime(saveAt)}
        {/if}
      </p>
    </div>
  </div>
</header>

<style>
  .page-head {
    margin-bottom: 16px;
  }

  .back {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 13px;
    gap: 4px;
    margin-bottom: 8px;
    text-decoration: none;
  }

  .back:hover {
    color: var(--text-primary);
    text-decoration: underline;
  }

  .title-row {
    align-items: flex-start;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  .title-block {
    min-width: 0;
  }

  .tracking {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    flex-wrap: wrap;
    font-size: 13px;
    gap: 6px;
    margin: 0;
  }

  .tracking h1 {
    color: var(--text-primary);
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .mono {
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .separator {
    color: var(--text-disabled);
  }

  .copy {
    align-items: center;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .copy:hover {
    background: var(--primary-subtle);
    color: var(--text-primary);
  }

  .return-line {
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .head-aside {
    align-items: flex-end;
    display: flex;
    flex-direction: column;
    flex: none;
    gap: 6px;
  }

  .save-status {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    min-height: 16px;
  }

  .retry {
    color: var(--link);
    font-size: 12px;
    text-decoration: underline;
  }
</style>

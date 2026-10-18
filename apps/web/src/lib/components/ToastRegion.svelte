<script lang="ts">
  import { Check, Copy, X } from '@lucide/svelte';

  import { dismissToast, toasts, type ToastItem } from '$lib/toast/toast.svelte';

  let copiedId = $state<number | null>(null);

  async function copy(item: ToastItem): Promise<void> {
    if (!item.copyText) return;
    try {
      await navigator.clipboard.writeText(item.copyText);
      copiedId = item.id;
    } catch {
      copiedId = null;
    }
  }
</script>

<div class="toast-region" aria-live="polite" aria-relevant="additions">
  {#each toasts as item (item.id)}
    <div class="toast toast-{item.kind}" role="status">
      <span class="toast-message">{item.message}</span>
      {#if item.copyText}
        <button
          class="copy"
          type="button"
          aria-label="Copy tracking number {item.copyText}"
          onclick={() => void copy(item)}
        >
          {#if copiedId === item.id}
            <Check size={14} aria-hidden="true" />
            Copied
          {:else}
            <Copy size={14} aria-hidden="true" />
            Copy
          {/if}
        </button>
      {/if}
      <button
        class="dismiss"
        type="button"
        aria-label="Dismiss notification"
        onclick={() => dismissToast(item.id)}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-region {
    bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: fixed;
    right: 24px;
    z-index: 60;
  }

  .toast-message {
    flex: 1;
    line-height: 1.45;
  }

  .copy {
    align-items: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    font-size: 11px;
    gap: 4px;
    height: 24px;
    padding: 0 6px;
    white-space: nowrap;
  }

  .copy:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .dismiss {
    align-items: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .dismiss:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .toast {
    border-left-style: solid;
  }
</style>

<script lang="ts">
  import { X } from '@lucide/svelte';

  import { dismissToast, toasts } from '$lib/toast/toast.svelte';
</script>

<div class="toast-region" aria-live="polite" aria-relevant="additions">
  {#each toasts as item (item.id)}
    <div class="toast toast-{item.kind}" role="status">
      <span class="toast-message">{item.message}</span>
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

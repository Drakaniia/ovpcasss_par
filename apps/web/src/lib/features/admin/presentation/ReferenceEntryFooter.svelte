<script lang="ts">
  import { LoaderCircle } from '@lucide/svelte';

  let {
    idPrefix,
    existing,
    isActive,
    busy,
    blockedReason,
    oncancel,
    ondeactivate,
    onactivate,
  }: {
    idPrefix: string;
    existing: boolean;
    isActive: boolean;
    busy: 'save' | 'deactivate' | 'activate' | null;
    blockedReason?: string;
    oncancel: () => void;
    ondeactivate: () => void;
    onactivate: () => void;
  } = $props();
</script>

<footer class="drawer-footer">
  <button class="btn btn-ghost" type="button" disabled={busy !== null} onclick={oncancel}>
    Cancel
  </button>

  <div class="footer-actions">
    {#if existing}
      {#if isActive}
        <div class="destructive-action">
          <button
            class="btn btn-outline danger-action"
            type="button"
            disabled={busy !== null || Boolean(blockedReason)}
            aria-describedby={blockedReason ? `${idPrefix}-deactivate-reason` : undefined}
            onclick={ondeactivate}
          >
            {#if busy === 'deactivate'}
              <span class="spin" aria-hidden="true"><LoaderCircle size={16} /></span>
              Deactivating…
            {:else}
              Deactivate
            {/if}
          </button>
          {#if blockedReason}
            <p class="field-hint" id="{idPrefix}-deactivate-reason">{blockedReason}</p>
          {/if}
        </div>
      {:else}
        <button class="btn btn-outline" type="button" disabled={busy !== null} onclick={onactivate}>
          {#if busy === 'activate'}
            <span class="spin" aria-hidden="true"><LoaderCircle size={16} /></span>
            Activating…
          {:else}
            Activate entry
          {/if}
        </button>
      {/if}
    {/if}

    <button class="btn btn-primary" type="submit" disabled={busy !== null}>
      {#if busy === 'save'}
        <span class="spin" aria-hidden="true"><LoaderCircle size={16} /></span>
        Saving…
      {:else}
        Save entry
      {/if}
    </button>
  </div>
</footer>

<style>
  .drawer-footer {
    align-items: flex-start;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding-top: 20px;
  }

  .footer-actions {
    align-items: flex-start;
    display: flex;
    gap: 8px;
  }

  .destructive-action {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 180px;
  }

  .destructive-action .field-hint {
    margin: 0;
    text-align: right;
  }

  .danger-action {
    border-color: var(--status-danger-fg);
    color: var(--status-danger-fg);
  }

  .danger-action:hover:not(:disabled) {
    background: var(--status-danger-bg);
  }

  .spin {
    animation: spin 1s linear infinite;
    display: inline-flex;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

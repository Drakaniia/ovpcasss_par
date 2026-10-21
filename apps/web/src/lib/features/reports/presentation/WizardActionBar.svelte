<script lang="ts">
  import { LoaderCircle } from '@lucide/svelte';

  import type { WizardStep } from '../application/wizard-form';

  /**
   * One primary action per step (UI phase 06 §2): Continue on steps 1–3, Submit
   * report on step 4. Back is outline and never validates. A block reason sits
   * next to Submit, never in a tooltip.
   */
  let {
    step,
    busy = false,
    blockReason,
    onback,
    oncontinue,
    onsubmit,
  }: {
    step: WizardStep;
    busy?: boolean;
    blockReason?: string;
    onback: () => void;
    oncontinue: () => void;
    onsubmit: () => void;
  } = $props();

  const blocked = $derived(step === 4 && Boolean(blockReason));
</script>

<div class="action-bar">
  <div class="action-inner">
    {#if step > 1}
      <button
        class="btn btn-outline"
        type="button"
        onclick={onback}
        disabled={busy}
        aria-keyshortcuts="ArrowLeft Alt+ArrowLeft"
      >
        <kbd class="kbd key" aria-hidden="true">←</kbd>
        Back
      </button>
    {:else}
      <span class="spacer"></span>
    {/if}

    <div class="action-end">
      {#if blocked}
        <p class="block-reason">{blockReason}</p>
      {/if}
      {#if step < 4}
        <button
          class="btn btn-primary"
          type="button"
          onclick={oncontinue}
          aria-keyshortcuts="ArrowRight Alt+ArrowRight"
        >
          Continue
          <kbd class="kbd key" aria-hidden="true">→</kbd>
        </button>
      {:else}
        <button class="btn btn-primary" type="button" disabled={busy || blocked} onclick={onsubmit}>
          {#if busy}
            <span class="spin" aria-hidden="true"><LoaderCircle size={16} /></span>
            Submitting…
          {:else}
            Submit report
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .action-bar {
    background: var(--surface-card);
    border-top: 1px solid var(--border);
    bottom: 0;
    left: 0;
    padding: 12px 24px;
    position: fixed;
    right: 0;
    z-index: 5;
  }

  .action-inner {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-inline: auto;
    max-width: 1032px;
  }

  .action-bar .btn {
    height: 36px;
  }

  /* The chip names the key that does the same thing as the button; on the
     filled button it stays a whisper, not a second control. */
  .btn-primary .key {
    background: color-mix(in srgb, var(--on-primary) 16%, transparent);
    border-color: color-mix(in srgb, var(--on-primary) 32%, transparent);
    color: var(--on-primary);
  }

  .spacer {
    display: inline-block;
  }

  .action-end {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .block-reason {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 0;
    max-width: 46ch;
    text-align: right;
  }

  .spin {
    animation: spin 900ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

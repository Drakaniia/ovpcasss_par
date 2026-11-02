<script lang="ts">
  import { ArrowLeft, ArrowRight, ClipboardCheck, Eye } from '@lucide/svelte';

  import type { WizardStep } from '../application/record-form';

  /**
   * One filled navy primary per screen. Continue leads steps 1-2 and the review
   * sheet leads to the send; step 3 opens that sheet, so its action names the
   * preview rather than the send the sheet itself carries. A step opened from the
   * review sheet says so, and its primary action is the way back to it.
   */
  let {
    step,
    mode,
    saving = false,
    editing = false,
    onback,
    oncontinue,
    onsave,
    onreview,
  }: {
    step: WizardStep;
    mode: 'create' | 'edit';
    saving?: boolean;
    /** Opened from the review sheet's pencil. */
    editing?: boolean;
    onback: () => void;
    oncontinue: () => void;
    onsave: () => void;
    onreview: () => void;
  } = $props();

  const primaryLabel = $derived(mode === 'create' ? 'Preview' : 'Save changes');
</script>

<div class="action-bar">
  <button class="btn btn-ghost" type="button" onclick={onback} disabled={saving}>
    <ArrowLeft size={16} aria-hidden="true" />
    {step === 1 ? 'Cancel' : 'Back'}
  </button>

  <div class="right">
    {#if editing}
      <button class="btn btn-primary" type="button" onclick={onreview} disabled={saving}>
        <ClipboardCheck size={16} aria-hidden="true" />
        Review details
      </button>
    {:else if step < 3}
      <button class="btn btn-primary" type="button" onclick={oncontinue} disabled={saving}>
        Continue
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    {:else}
      <button class="btn btn-primary" type="button" onclick={onsave} disabled={saving}>
        {#if mode === 'create'}
          <Eye size={16} aria-hidden="true" />
        {/if}
        {saving ? 'Saving…' : primaryLabel}
      </button>
    {/if}
  </div>
</div>

<style>
  .action-bar {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-top: 24px;
    padding-top: 16px;
  }

  .right {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  /*
   * Tablet and phone: the step's action travels with the thumb instead of
   * waiting at the end of the form.
   */
  @media (max-width: 1023px) {
    /* The bar reaches past the page gutter, so content never shows beside it. */
    .action-bar {
      background: var(--surface-page);
      bottom: 0;
      margin-inline: -16px;
      margin-top: 20px;
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
      position: sticky;
      z-index: 5;
    }
  }

  @media (max-width: 639px) {
    .action-bar {
      margin-inline: -12px;
      padding-inline: 12px;
    }

    .right {
      flex: 1 1 auto;
      justify-content: flex-end;
      min-width: 0;
    }

    .right .btn {
      width: 100%;
    }
  }
</style>

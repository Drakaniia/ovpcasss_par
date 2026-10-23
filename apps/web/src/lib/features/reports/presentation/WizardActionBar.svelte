<script lang="ts">
  import { ArrowLeft, ArrowRight, Send } from '@lucide/svelte';

  import type { WizardStep } from '../application/record-form';

  /**
   * One filled navy primary per screen. Continue leads steps 1-2; step 3 hands
   * the record to the personnel in charge with the only filled action there.
   */
  let {
    step,
    mode,
    saving = false,
    onback,
    oncontinue,
    onsave,
  }: {
    step: WizardStep;
    mode: 'create' | 'edit';
    saving?: boolean;
    onback: () => void;
    oncontinue: () => void;
    onsave: () => void;
  } = $props();

  const primaryLabel = $derived(mode === 'create' ? 'Create and send' : 'Save changes');
</script>

<div class="action-bar">
  <button class="btn btn-ghost" type="button" onclick={onback} disabled={saving}>
    <ArrowLeft size={16} aria-hidden="true" />
    {step === 1 ? 'Cancel' : 'Back'}
  </button>

  <div class="right">
    {#if step < 3}
      <button class="btn btn-primary" type="button" onclick={oncontinue} disabled={saving}>
        Continue
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    {:else}
      <button class="btn btn-primary" type="button" onclick={onsave} disabled={saving}>
        {#if mode === 'create'}
          <Send size={16} aria-hidden="true" />
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
</style>

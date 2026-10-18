<script lang="ts">
  import { saveStatusText, type SaveState } from '../application/wizard-draft';
  import { STEP_META, type WizardStep } from '../application/wizard-form';
  import WizardStepper from './WizardStepper.svelte';

  /**
   * Focused task header (UI phase 06 §2). The save status is always present;
   * a failed autosave becomes a text action, never a modal.
   */
  let {
    heading = 'New post-activity report',
    step,
    saveState,
    onstep,
    onsave,
    onretry,
  }: {
    /** A resumed draft says "Continue" instead of "New" (spec §7.4). */
    heading?: string;
    step: WizardStep;
    saveState: SaveState;
    onstep: (step: WizardStep) => void;
    onsave: () => void;
    onretry: () => void;
  } = $props();

  const status = $derived(saveStatusText(saveState));
</script>

<header class="wizard-head">
  <div class="head-top">
    <div class="identity">
      <h1>{heading}</h1>
      <div class="step-row">
        <p class="step-label">Step {step} of 4 — {STEP_META[step].title}</p>
        <WizardStepper {step} {onstep} />
      </div>
    </div>

    <div class="head-actions">
      <span class="save-status" aria-live="polite">
        {#if saveState.status === 'error'}
          <button class="save-retry" type="button" onclick={onretry}>{status}</button>
        {:else}
          {status}
        {/if}
      </span>
      <button class="btn btn-ghost btn-sm" type="button" onclick={onsave}>
        Save draft and exit
      </button>
    </div>
  </div>
</header>

<style>
  .wizard-head {
    margin-bottom: 20px;
  }

  .head-top {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
  }

  h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .step-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 6px;
  }

  .step-label {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .head-actions {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .save-status {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .save-retry {
    background: none;
    border: 0;
    color: var(--status-danger-fg);
    font-size: 12px;
    padding: 0;
    text-decoration: underline;
  }
</style>

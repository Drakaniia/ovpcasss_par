<script lang="ts">
  import { STEP_META, type WizardStep } from '../application/record-form';
  import WizardStepper from './WizardStepper.svelte';

  /** Focused task header (UI phase 06 §2) for the office's three-step record form. */
  let {
    heading,
    step,
    onstep,
  }: {
    heading: string;
    step: WizardStep;
    onstep: (step: WizardStep) => void;
  } = $props();
</script>

<header class="wizard-head">
  <div class="identity">
    <h1>{heading}</h1>
    <div class="step-row">
      <p class="step-label">Step {step} of 3 — {STEP_META[step].title}</p>
      <WizardStepper {step} {onstep} />
    </div>
  </div>
</header>

<style>
  .wizard-head {
    margin-bottom: 20px;
  }

  .identity {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 6px;
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
  }

  .step-label {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }
</style>

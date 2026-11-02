<script lang="ts">
  import { STEP_META, type WizardStep } from '../application/record-form';
  import WizardStepper from './WizardStepper.svelte';

  /** Focused task header (UI phase 06 §2) for the office's three-step record form. */
  let {
    heading,
    step,
    editing = false,
    onstep,
  }: {
    heading: string;
    step: WizardStep;
    /** The step was opened from the review sheet and is under correction. */
    editing?: boolean;
    onstep: (step: WizardStep) => void;
  } = $props();
</script>

<header class="wizard-head">
  <div class="identity">
    <h1>{heading}</h1>
    <div class="step-row">
      <p class="step-label" class:is-editing={editing}>
        Step {step} of 3 — {editing
          ? `Editing the ${STEP_META[step].short.toLowerCase()}`
          : STEP_META[step].title}
      </p>
      <WizardStepper {step} {editing} {onstep} />
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

  /* The active tab of the edit: the step says what it is for, quietly. */
  .step-label.is-editing {
    color: var(--primary);
    font-weight: 500;
  }

  @media (max-width: 1023px) {
    .wizard-head {
      margin-bottom: 14px;
    }
  }

  /* Phone: the step line gets its own row above the stepper. */
  @media (max-width: 639px) {
    .step-row {
      gap: 8px;
    }

    .step-label {
      flex-basis: 100%;
    }
  }
</style>

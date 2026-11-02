<script lang="ts">
  import { Check } from '@lucide/svelte';

  import { STEP_META, WIZARD_STEPS, type WizardStep } from '../application/record-form';

  let {
    step,
    editing = false,
    onstep,
  }: {
    step: WizardStep;
    /** Opened from the review sheet: the current step reads as the active tab. */
    editing?: boolean;
    onstep: (step: WizardStep) => void;
  } = $props();
</script>

<nav class="stepper" aria-label="Wizard steps">
  {#each WIZARD_STEPS as item (item)}
    <button
      class="step"
      class:is-current={item === step}
      class:is-editing={item === step && editing}
      class:is-complete={item < step}
      type="button"
      aria-current={item === step ? 'step' : undefined}
      aria-label="Step {item} of 3 — {STEP_META[item].title}"
      onclick={() => onstep(item)}
    >
      <span class="dot" aria-hidden="true">
        {#if item < step}
          <Check size={12} />
        {:else}
          {item}
        {/if}
      </span>
    </button>
    {#if item !== 3}
      <span class="line" class:is-complete={item < step} aria-hidden="true"></span>
    {/if}
  {/each}
</nav>

<style>
  .stepper {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .step {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 50%;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    padding: 0;
    width: 32px;
  }

  .dot {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    height: 22px;
    justify-content: center;
    transition:
      background 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease;
    width: 22px;
  }

  .step.is-complete .dot {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }

  .step.is-current .dot {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-subtle);
    color: var(--primary);
    font-weight: 600;
  }

  /* Editing: the dot is filled and holds its ring, like the active tab. */
  .step.is-editing .dot {
    background: var(--primary);
    border-color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-subtle);
    color: var(--on-primary);
  }

  .step:hover .dot {
    border-color: var(--primary);
  }

  .line {
    background: var(--border);
    height: 1px;
    transition: background 120ms ease;
    width: 18px;
  }

  .line.is-complete {
    background: var(--primary);
  }

  /* The dot stays 22 px; the target around it grows to a thumb. */
  @media (max-width: 1023px) {
    .step {
      height: 44px;
      width: 44px;
    }

    .stepper {
      gap: 4px;
    }

    .line {
      width: 12px;
    }
  }
</style>

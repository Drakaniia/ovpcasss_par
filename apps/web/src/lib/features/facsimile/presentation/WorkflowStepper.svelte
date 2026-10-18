<script lang="ts">
  import type { ReportStatus } from '@par/shared';
  import { Check } from '@lucide/svelte';

  import { STAGES, stepperState } from '../application/facsimile-workflow';

  /**
   * Five stages, text + shape + color (UI spec §7.7). The stages are a reading
   * device: every one maps back to an API status, and returned/resubmitted
   * states add a chip rather than inventing a sixth stage.
   */
  let { status }: { status: ReportStatus } = $props();

  const stepper = $derived(stepperState(status));

  const STATE_NOTE = {
    complete: 'completed',
    current: 'current stage',
    upcoming: 'not yet reached',
  } as const;
</script>

<nav class="workflow-stepper" aria-label="Workflow progress">
  <ol>
    {#each STAGES as stage, index (stage.key)}
      {@const state = stepper.states[index]}
      <li
        class="stage is-{state}"
        class:has-line={index > 0}
        aria-current={state === 'current' ? 'step' : undefined}
      >
        <span class="dot" aria-hidden="true">
          {#if state === 'complete'}
            <Check size={11} strokeWidth={3} />
          {:else if state === 'current'}
            <span class="core"></span>
          {/if}
        </span>

        <span class="label">
          {stage.label}
          <span class="sr-only"> — {STATE_NOTE[state]}</span>
        </span>

        {#if stepper.chip && index === stepper.current}
          {#if stepper.chip.href}
            <a class="chip chip-{stepper.chip.tone}" href={stepper.chip.href}>
              {stepper.chip.label}
            </a>
          {:else}
            <span class="chip chip-{stepper.chip.tone}">{stepper.chip.label}</span>
          {/if}
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .workflow-stepper ol {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .stage {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
  }

  /* The connector runs behind the dots, so the stage that owns it decides its tone. */
  .stage.has-line::before {
    background: var(--border);
    content: '';
    height: 1px;
    left: -50%;
    position: absolute;
    top: 9px;
    transition: background 120ms ease;
    width: 100%;
  }

  .stage.is-complete::before,
  .stage.is-current::before {
    background: var(--primary);
  }

  .dot {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    height: 18px;
    justify-content: center;
    position: relative;
    width: 18px;
    z-index: 1;
  }

  .stage.is-complete .dot {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }

  .stage.is-current .dot {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-subtle);
  }

  .core {
    background: var(--primary);
    border-radius: 50%;
    height: 6px;
    width: 6px;
  }

  .label {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    white-space: nowrap;
  }

  .is-complete .label {
    color: var(--text-primary);
  }

  .is-current .label {
    color: var(--text-primary);
    font-weight: 600;
  }

  .is-upcoming .label {
    color: var(--text-disabled);
  }

  .chip {
    border-radius: var(--radius-badge);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 2px 6px;
    white-space: nowrap;
  }

  .chip-danger {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .chip-info {
    background: var(--status-info-bg);
    color: var(--status-info-fg);
  }

  a.chip:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .stage.has-line::before {
      transition: none;
    }
  }
</style>

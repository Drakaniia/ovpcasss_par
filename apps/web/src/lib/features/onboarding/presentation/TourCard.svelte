<script lang="ts">
  import type { ResolvedStep } from '../application/tour-steps';

  /**
   * The card itself (onboarding spec §11.3). Presentational only: every value
   * comes from the resolved step, so the counter can never disagree with the
   * list the engine is walking.
   */
  let {
    step,
    onback,
    onnext,
    onskip,
  }: {
    step: ResolvedStep;
    onback: () => void;
    onnext: () => void;
    onskip: () => void;
  } = $props();

  const first = $derived(step.position === 1);
  const progress = $derived(`${(step.position / step.total) * 100}%`);
  const primaryLabel = $derived(
    step.id === 'welcome' ? 'Get started' : step.final ? 'Start exploring' : 'Next',
  );
</script>

<div class="tour-card">
  <header class="head">
    <h2 class="title" id="tour-title">{step.title}</h2>
    <p class="counter">Step {step.position} of {step.total}</p>
  </header>

  <div class="track" aria-hidden="true">
    <span class="fill" style:width={progress}></span>
  </div>

  <p class="body" id="tour-description">{step.description}</p>

  <footer class="actions">
    {#if !step.final}
      <button class="btn btn-ghost skip" type="button" onclick={onskip}>Skip tour</button>
    {/if}
    {#if !first}
      <button class="btn btn-outline" type="button" onclick={onback}>Back</button>
    {/if}
    <button class="btn btn-primary" type="button" data-tour-primary onclick={onnext}>
      {primaryLabel}
    </button>
  </footer>
</div>

<style>
  .tour-card {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card-lg);
    box-shadow: var(--shadow-raised);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 32px);
    max-width: min(340px, calc(100vw - 32px));
    padding: 20px;
    width: 340px;
  }

  .head {
    align-items: baseline;
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.3;
    margin: 0;
  }

  .counter {
    color: var(--text-secondary);
    flex: none;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin: 0;
    white-space: nowrap;
  }

  .track {
    background: var(--border);
    border-radius: 2px;
    height: 3px;
    margin-top: 10px;
    overflow: hidden;
  }

  .fill {
    background: var(--primary);
    border-radius: 2px;
    display: block;
    height: 100%;
    transition: width var(--duration-base) var(--ease-standard);
  }

  .body {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.55;
    margin: 12px 0 0;
    overflow-y: auto;
  }

  .actions {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  /* Skip is the way out, so it sits away from the two step controls. */
  .skip {
    color: var(--text-secondary);
    margin-right: auto;
    min-height: 32px;
    padding-inline: 8px;
  }

  .actions :global(.btn) {
    transition: transform var(--duration-fast) ease-out;
  }

  /* Feedback on the press, not on the release. */
  .actions :global(.btn:active) {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }

    .actions :global(.btn:active) {
      transform: none;
    }
  }
</style>

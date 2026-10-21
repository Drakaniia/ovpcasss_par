<script lang="ts">
  import type { InboxOnboarding } from '@par/shared';
  import { ArrowRight, Check } from '@lucide/svelte';

  import { checklistFor, completedStepCount } from '../application/inbox-view';

  let { onboarding }: { onboarding: InboxOnboarding } = $props();

  const steps = $derived(checklistFor(onboarding));
  const completed = $derived(completedStepCount(steps));
</script>

<section
  class="card onboarding"
  data-tour="onboarding-checklist"
  aria-labelledby="onboarding-title"
>
  <header class="head">
    <div>
      <h2 id="onboarding-title">Get started</h2>
      <p class="lede">Three steps to your first submitted report.</p>
    </div>
    <p class="progress">{completed} of 3 complete</p>
  </header>

  <ol class="steps">
    {#each steps as step, index (step.id)}
      <li class="step" class:complete={step.complete}>
        <span class="marker" aria-hidden="true">
          {#if step.complete}
            <Check size={14} />
          {:else}
            {index + 1}
          {/if}
        </span>
        <div class="step-body">
          <p class="step-title">
            {step.title}
            {#if step.complete}
              <span class="done">Complete</span>
            {/if}
          </p>
          <p class="step-copy">{step.description}</p>
          <a class="step-link" href={step.href}>
            {step.linkLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  .onboarding {
    max-width: 760px;
    padding: 24px;
  }

  .head {
    align-items: baseline;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  h2 {
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .progress {
    color: var(--text-secondary);
    flex: none;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 16px;
    list-style: none;
    margin: 20px 0 0;
    padding: 0;
  }

  .step {
    align-items: flex-start;
    display: flex;
    gap: 12px;
  }

  .marker {
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    font-size: 12px;
    font-weight: 500;
    height: 24px;
    justify-content: center;
    margin-top: 1px;
    width: 24px;
  }

  .complete .marker {
    background: var(--status-success-bg);
    border-color: var(--status-success-fg);
    color: var(--status-success-fg);
  }

  .step-title {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    font-size: 14px;
    font-weight: 500;
    gap: 8px;
    margin: 0;
  }

  .done {
    color: var(--status-success-fg);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .step-copy {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 2px 0 4px;
  }

  .step-link {
    align-items: center;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    min-height: 32px;
  }
</style>

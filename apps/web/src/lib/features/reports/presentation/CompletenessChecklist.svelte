<script lang="ts">
  import { Check, Circle } from '@lucide/svelte';

  import { completenessSummary, type CompletenessItem } from '../application/wizard-completeness';
  import type { WizardStep } from '../application/wizard-form';

  /**
   * Fixed, ordered checklist (UI phase 06 §5). Every item shows text plus a
   * check or circle, never colour alone. The rail is sticky on wide screens; the
   * bar variant is the one-line meter below 1280 px.
   */
  let {
    items,
    variant = 'rail',
    onstep,
  }: {
    items: CompletenessItem[];
    variant?: 'rail' | 'bar';
    onstep?: (step: WizardStep) => void;
  } = $props();

  const headingId = $props.id();
  const summary = $derived(completenessSummary(items));
  const firstMissing = $derived(summary.missing[0]);
</script>

{#if variant === 'bar'}
  <div class="completeness-bar" role="status" aria-live="polite">
    <div class="bar-copy">
      <span class="bar-label">Completeness {summary.complete} of {summary.total}</span>
      {#if firstMissing}
        <span class="bar-missing">— {firstMissing.label} missing</span>
      {/if}
    </div>
    <div class="segments" aria-hidden="true">
      {#each items as item (item.id)}
        <span class:filled={item.complete}></span>
      {/each}
    </div>
  </div>
{:else}
  <section class="completeness" aria-labelledby={headingId}>
    <h2 id={headingId} class="eyebrow">Completeness</h2>

    <ul class="items">
      {#each items as item (item.id)}
        <li class:is-complete={item.complete}>
          <span class="mark" aria-hidden="true">
            {#if item.complete}
              <Check size={14} />
            {:else}
              <Circle size={14} />
            {/if}
          </span>

          <span class="item-body">
            <span class="item-label">{item.label}</span>
            {#if item.missing?.length}
              {#each item.missing as label (label)}
                {#if onstep}
                  <button class="missing-link" type="button" onclick={() => onstep(4)}>
                    {label} (required)
                  </button>
                {:else}
                  <span class="missing-link">{label} (required)</span>
                {/if}
              {/each}
            {/if}
          </span>
        </li>
      {/each}
    </ul>

    <div class="meter">
      <div class="segments" aria-hidden="true">
        {#each items as item (item.id)}
          <span class:filled={item.complete}></span>
        {/each}
      </div>
      <p class="meter-text">{summary.text}</p>
    </div>
  </section>
{/if}

<style>
  .completeness {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 16px;
  }

  .eyebrow {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    margin: 0 0 12px;
    text-transform: uppercase;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .items li {
    align-items: flex-start;
    color: var(--text-secondary);
    display: flex;
    font-size: 13px;
    gap: 8px;
    line-height: 1.4;
  }

  .items li.is-complete {
    color: var(--text-primary);
  }

  .mark {
    color: var(--text-disabled);
    flex: none;
    margin-top: 1px;
  }

  li.is-complete .mark {
    color: var(--status-success-fg);
  }

  .item-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .item-label {
    overflow-wrap: anywhere;
  }

  .missing-link {
    background: none;
    border: 0;
    color: var(--status-danger-fg);
    font-size: 12px;
    padding: 0;
    text-align: left;
  }

  button.missing-link:hover {
    text-decoration: underline;
  }

  .meter {
    border-top: 1px solid var(--border);
    margin-top: 16px;
    padding-top: 12px;
  }

  .segments {
    display: grid;
    gap: 2px;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    height: 4px;
  }

  .segments span {
    background: var(--border);
    border-radius: 1px;
  }

  .segments span.filled {
    background: var(--primary);
  }

  .meter-text {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 8px 0 0;
  }

  .completeness-bar {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 10px 14px;
  }

  .bar-copy {
    font-size: 13px;
    min-width: 0;
  }

  .bar-label {
    font-weight: 500;
  }

  .bar-missing {
    color: var(--text-secondary);
  }

  .completeness-bar .segments {
    flex: none;
    width: 120px;
  }
</style>

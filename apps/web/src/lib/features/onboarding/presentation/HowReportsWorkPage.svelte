<script lang="ts">
  import { Check, ChevronRight, Mail } from '@lucide/svelte';
  import { tick } from 'svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { session } from '$lib/session/session.svelte';

  import { WORKFLOW_STAGES } from '../application/how-it-works';

  /**
   * The interactive explainer (UI spec §4.2). Stages are reading aids anchored
   * to the API statuses, so the screen teaches the real workflow rather than a
   * parallel description of it. A vertical tablist keeps it keyboard-reachable.
   */
  let active = $state(0);

  const stage = $derived(WORKFLOW_STAGES[active]);
  const canCreate = $derived(session.user?.role === 'ADMIN');

  function focusStage(index: number): void {
    active = index;
    void tick().then(() =>
      document.getElementById(`stage-tab-${WORKFLOW_STAGES[index].key}`)?.focus(),
    );
  }

  function walk(event: KeyboardEvent): void {
    const last = WORKFLOW_STAGES.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusStage(active === last ? 0 : active + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusStage(active === 0 ? last : active - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusStage(0);
        break;
      case 'End':
        event.preventDefault();
        focusStage(last);
        break;
      default:
        break;
    }
  }
</script>

<svelte:head><title>How the report works · OVPCASSS Paperless PAR</title></svelte:head>

<header class="page-head">
  <div>
    <p class="kicker">Guide</p>
    <h1>How the Post-Activity Report works</h1>
    <p class="lede">
      Every report follows the same three stages and four statuses. Choose a stage to read what
      happens, who acts, and what reaches the people involved.
    </p>
  </div>
  {#if canCreate}
    <a class="btn btn-primary" href="/reports/new">Create a record</a>
  {:else}
    <a class="btn" href="/reports">View your assignments</a>
  {/if}
</header>

<div class="how">
  <div class="stages" role="tablist" aria-orientation="vertical" aria-label="Workflow stages">
    {#each WORKFLOW_STAGES as item, index (item.key)}
      <button
        class="stage"
        class:is-active={index === active}
        type="button"
        role="tab"
        id={`stage-tab-${item.key}`}
        aria-selected={index === active}
        aria-controls="stage-panel"
        tabindex={index === active ? 0 : -1}
        onclick={() => focusStage(index)}
        onkeydown={walk}
      >
        <span class="stage-index" aria-hidden="true">{index + 1}</span>
        <span class="stage-text">
          <span class="stage-title">{item.title}</span>
          <span class="stage-owner">{item.owner}</span>
        </span>
        <span class="stage-chevron"><ChevronRight size={15} aria-hidden="true" /></span>
      </button>
    {/each}
  </div>

  <div
    class="panel card"
    id="stage-panel"
    role="tabpanel"
    aria-labelledby={`stage-tab-${stage.key}`}
    tabindex="0"
  >
    <p class="panel-owner">{stage.owner}</p>
    <h2>{stage.title}</h2>
    <p class="panel-summary">{stage.summary}</p>

    <ul class="points">
      {#each stage.points as point (point)}
        <li>
          <Check size={15} aria-hidden="true" />
          <span>{point}</span>
        </li>
      {/each}
    </ul>

    <div class="statuses">
      <span class="statuses-label">Report status at this stage</span>
      <div class="status-chips">
        {#each stage.statuses as status (status)}
          <StatusBadge {status} />
        {/each}
      </div>
    </div>

    <p class="mail">
      <Mail size={15} aria-hidden="true" />
      <span>{stage.mail}</span>
    </p>

    <p class="note">{stage.note}</p>
  </div>
</div>

<style>
  .page-head {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .page-head h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .kicker {
    color: var(--brand-gold-600);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    margin: 0 0 6px;
    text-transform: uppercase;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
    margin: 6px 0 0;
    max-width: 62ch;
  }

  .how {
    align-items: start;
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  }

  .stages {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stage {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--text-primary);
    display: flex;
    font-family: var(--font-ui);
    gap: 10px;
    padding: 10px 10px 10px 8px;
    text-align: left;
    transition:
      background 140ms ease,
      border-color 140ms ease;
    width: 100%;
  }

  .stage:hover {
    background: var(--surface-page);
  }

  .stage.is-active {
    background: var(--surface-card);
    border-color: var(--border);
    box-shadow: var(--shadow-raised);
  }

  .stage-index {
    align-items: center;
    background: var(--navy-100, #e9edf6);
    border-radius: 50%;
    color: var(--brand-navy-700);
    display: inline-flex;
    flex: none;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    height: 22px;
    justify-content: center;
    width: 22px;
  }

  .stage.is-active .stage-index {
    background: var(--primary);
    color: var(--on-primary);
  }

  .stage-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .stage-title {
    font-size: 13.5px;
    font-weight: 600;
  }

  .stage-owner {
    color: var(--text-secondary);
    font-size: 11.5px;
  }

  .stage-chevron {
    color: var(--text-disabled);
    display: inline-flex;
    flex: none;
    margin-left: auto;
    opacity: 0;
    transition: opacity 140ms ease;
  }

  .stage.is-active .stage-chevron {
    opacity: 1;
  }

  .panel {
    padding: 24px;
  }

  .panel:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 22%, transparent);
    outline: none;
  }

  .panel-owner {
    color: var(--brand-gold-600);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    margin: 0 0 6px;
    text-transform: uppercase;
  }

  .panel h2 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .panel-summary {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.65;
    margin: 8px 0 0;
    max-width: 68ch;
  }

  .points {
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
    margin: 20px 0 0;
    padding: 0;
  }

  .points li {
    display: flex;
    font-size: 13.5px;
    gap: 9px;
    line-height: 1.6;
  }

  .points li :global(svg) {
    color: var(--brand-navy-700);
    flex: none;
    margin-top: 3px;
  }

  .statuses {
    border-top: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
  }

  .statuses-label {
    color: var(--text-secondary);
    font-size: 12px;
    width: 100%;
  }

  .status-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mail {
    align-items: flex-start;
    background: var(--surface-page);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: flex;
    font-size: 12.5px;
    gap: 8px;
    line-height: 1.55;
    margin: 16px 0 0;
    padding: 10px 12px;
  }

  .mail :global(svg) {
    flex: none;
    margin-top: 2px;
  }

  .note {
    color: var(--text-secondary);
    font-size: 12.5px;
    font-style: italic;
    margin: 14px 0 0;
  }

  @media (max-width: 1180px) {
    .how {
      grid-template-columns: minmax(0, 1fr);
    }

    .stages {
      flex-direction: row;
      overflow-x: auto;
    }

    .stage {
      flex: 1 0 auto;
      width: auto;
    }

    .stage-chevron {
      display: none;
    }
  }
</style>

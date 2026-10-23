<script lang="ts">
  import type { WizardStep } from '../application/record-form';
  import type { RecordFormState } from '../application/record-state.svelte';
  import RecordFormStepClassify from './WizardStepClassify.svelte';
  import RecordFormStepDetails from './WizardStepDetails.svelte';
  import RecordFormStepPeople from './WizardStepPeople.svelte';
  import WizardActionBar from './WizardActionBar.svelte';
  import WizardErrorSummary from './WizardErrorSummary.svelte';
  import WizardHeader from './WizardHeader.svelte';

  let {
    state,
    heading,
    onstep,
    oncontinue,
    onsave,
    onback,
    onfocus,
    onkeydown,
  }: {
    state: RecordFormState;
    heading: string;
    onstep: (step: WizardStep) => void;
    oncontinue: () => void;
    onsave: () => void;
    onback: () => void;
    onfocus: (id: string | undefined) => void;
    onkeydown: (event: KeyboardEvent) => void;
  } = $props();
</script>

<form
  class="record-form"
  novalidate
  onsubmit={(event) => event.preventDefault()}
  onfocusout={(event) => state.onFocusOut(event)}
  {onkeydown}
>
  <WizardHeader {heading} step={state.step} {onstep} />

  {#if state.summaryVisible}
    <WizardErrorSummary errors={state.errors} form={state.form} {onfocus} />
  {/if}

  {#if state.referencesError}
    <p class="inline-note" role="status">
      The reference lists did not load. Reload the page before saving.
    </p>
  {/if}

  {#if state.step === 1}
    <RecordFormStepClassify {state} />
  {:else if state.step === 2}
    <RecordFormStepDetails {state} />
  {:else}
    <RecordFormStepPeople {state} />
  {/if}

  <WizardActionBar
    step={state.step}
    mode={state.mode}
    saving={state.saving}
    {onback}
    {oncontinue}
    {onsave}
  />
</form>

<style>
  .record-form {
    max-width: 880px;
  }

  .inline-note {
    background: var(--status-warning-bg);
    border-radius: var(--radius-card);
    color: var(--status-warning-fg);
    font-size: 12px;
    margin: 0 0 16px;
    padding: 8px 12px;
  }
</style>

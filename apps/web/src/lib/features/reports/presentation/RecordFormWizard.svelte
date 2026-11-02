<script lang="ts">
  import type { WizardStep } from '../application/record-form';
  import type { RecordFormState } from '../application/record-state.svelte';
  import RecordFormStepClassify from './WizardStepClassify.svelte';
  import RecordFormStepDetails from './WizardStepDetails.svelte';
  import RecordFormStepPeople from './WizardStepPeople.svelte';
  import RecordReviewDialog from './RecordReviewDialog.svelte';
  import WizardActionBar from './WizardActionBar.svelte';
  import WizardErrorSummary from './WizardErrorSummary.svelte';
  import WizardHeader from './WizardHeader.svelte';

  let {
    state,
    heading,
    onstep,
    oncontinue,
    onsave,
    onsend,
    onback,
    onfocus,
    onkeydown,
  }: {
    state: RecordFormState;
    heading: string;
    onstep: (step: WizardStep) => void;
    oncontinue: () => void;
    /** The final action of the step: the review sheet for a new record. */
    onsave: () => void;
    /** The review sheet's own confirm: the request. */
    onsend: () => void;
    onback: () => void;
    onfocus: (id: string | undefined) => void;
    onkeydown: (event: KeyboardEvent) => void;
  } = $props();

  /** The review's pencil reopened this step, so the wizard says so. */
  const editing = $derived(state.reviewEditStep !== null);
</script>

<form
  class="record-form"
  novalidate
  onsubmit={(event) => event.preventDefault()}
  onfocusout={(event) => state.onFocusOut(event)}
  {onkeydown}
>
  <WizardHeader {heading} step={state.step} {editing} {onstep} />

  {#if state.summaryVisible}
    <WizardErrorSummary errors={state.errors} form={state.form} {onfocus} />
  {/if}

  {#if state.referencesError}
    <p class="inline-note" role="status">
      The reference lists did not load. Reload the page before saving.
    </p>
  {/if}

  <div class="step-shell" class:is-editing={editing}>
    {#if state.step === 1}
      <RecordFormStepClassify {state} />
    {:else if state.step === 2}
      <RecordFormStepDetails {state} />
    {:else}
      <RecordFormStepPeople {state} />
    {/if}
  </div>

  <WizardActionBar
    step={state.step}
    mode={state.mode}
    saving={state.saving}
    {editing}
    {onback}
    {oncontinue}
    {onsave}
    onreview={() => void state.backToReview()}
  />
</form>

<RecordReviewDialog
  open={state.reviewOpen}
  form={state.form}
  references={state.references}
  saving={state.saving}
  onedit={(step: WizardStep) => void state.editFromReview(step)}
  onconfirm={onsend}
  oncancel={() => state.closeReview()}
/>

<style>
  .record-form {
    max-width: 880px;
  }

  /* The pane under correction carries the tint; the edit is felt, not announced. */
  .step-shell {
    border-left: 2px solid transparent;
    margin: 0 -14px;
    padding: 5px 14px;
    transition:
      background var(--duration-base) var(--ease-standard),
      border-color var(--duration-base) var(--ease-standard);
  }

  .step-shell.is-editing {
    background: var(--primary-subtle);
    border-left-color: var(--primary);
    border-radius: 0 var(--radius-card) var(--radius-card) 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .step-shell {
      transition: none;
    }
  }

  /* The sticky action bar sits over the foot of the form; leave it air. */
  @media (max-width: 1023px) {
    .record-form {
      padding-bottom: 8px;
    }
  }

  /*
   * The correction tint bleeds 14 px past each edge, which is wider than the
   * phone page padding and would scroll sideways. Inside the column it stays.
   */
  @media (max-width: 639px) {
    .step-shell {
      margin: 0;
      padding: 5px 8px;
    }

    .step-shell.is-editing {
      border-radius: var(--radius-card);
    }
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

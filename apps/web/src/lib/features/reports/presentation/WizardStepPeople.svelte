<script lang="ts">
  import type { RecordFormState } from '../application/record-state.svelte';
  import PicRows from './PicRows.svelte';
  import WizardField from './WizardField.svelte';

  /** Step 3 — the counts and the people who will write the narrative. */
  let { state }: { state: RecordFormState } = $props();
</script>

<section id="wizard-step-3" tabindex="-1" aria-labelledby="wizard-step-3-title" class="step-pane">
  <h2 id="wizard-step-3-title" class="visually-hidden">People and hand-over</h2>

  <div class="two-col">
    <WizardField
      id="wiz-total-students"
      label="Total number of students"
      required
      error={state.errors.totalStudents}
    >
      {#snippet children({ describedBy, invalid })}
        <input
          id="wiz-total-students"
          class="input"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          value={state.form.totalStudents}
          oninput={(event) => state.patchForm({ totalStudents: event.currentTarget.value })}
        />
      {/snippet}
    </WizardField>

    <WizardField
      id="wiz-total-pic"
      label="Total number of PIC"
      hint="Counted from the list below."
      error={state.errors.totalPic}
    >
      {#snippet children({ describedBy, invalid })}
        <input
          id="wiz-total-pic"
          class="input"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          readonly
          aria-readonly="true"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          value={state.form.pics.length}
        />
      {/snippet}
    </WizardField>
  </div>

  {#if state.errors.pics}
    <p class="rows-error" role="alert">{state.errors.pics}</p>
  {/if}

  <PicRows
    pics={state.form.pics}
    errors={state.errors}
    onpatch={(id, patch) => state.patchPic(id, patch)}
    onadd={() => state.addPic()}
    onremove={(id) => state.removePic(id)}
  />
</section>

<style>
  .step-pane {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .two-col {
    display: grid;
    gap: 16px 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rows-error {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 0;
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

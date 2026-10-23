<script lang="ts">
  import type { RecordFormState } from '../application/record-state.svelte';
  import LocationField from './LocationField.svelte';
  import SdgPicker from './SdgPicker.svelte';
  import WizardDateField from './WizardDateField.svelte';
  import WizardField from './WizardField.svelte';

  /** Step 2 — what happened, where, when, and how many sessions it covered. */
  let { state }: { state: RecordFormState } = $props();
</script>

<section id="wizard-step-2" tabindex="-1" aria-labelledby="wizard-step-2-title" class="step-pane">
  <h2 id="wizard-step-2-title" class="visually-hidden">Activity</h2>

  <WizardField id="wiz-title" label="Title of the activity" required error={state.errors.title}>
    {#snippet children({ describedBy, invalid })}
      <input
        id="wiz-title"
        class="input"
        type="text"
        maxlength="300"
        placeholder="Enter the title of the activity"
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        value={state.form.title}
        oninput={(event) => state.patchForm({ title: event.currentTarget.value })}
      />
    {/snippet}
  </WizardField>

  <div class="two-col">
    <WizardDateField
      id="wiz-start-date"
      label="Start date"
      value={state.form.startDate}
      text={state.form.startText}
      error={state.errors.startDate}
      ontext={(text) => state.patchForm({ startText: text })}
      onchange={(iso) => state.patchForm({ startDate: iso })}
    />

    <WizardDateField
      id="wiz-end-date"
      label="End date"
      value={state.form.endDate}
      text={state.form.endText}
      error={state.errors.endDate}
      ontext={(text) => state.patchForm({ endText: text })}
      onchange={(iso) => state.patchForm({ endDate: iso })}
    />
  </div>

  <div class="two-col">
    <WizardField id="wiz-location" label="Location" required error={state.errors.location}>
      {#snippet children({ describedBy, invalid })}
        <LocationField
          id="wiz-location"
          label="Location"
          value={state.form.location}
          {invalid}
          {describedBy}
          onchange={(value) => state.patchForm({ location: value })}
        />
      {/snippet}
    </WizardField>

    <WizardField
      id="wiz-activity-count"
      label="Number of activities"
      required
      error={state.errors.activityCount}
      hint="How many sessions or days this record covers."
    >
      {#snippet children({ describedBy, invalid })}
        <input
          id="wiz-activity-count"
          class="input"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          value={state.form.activityCount}
          oninput={(event) => state.patchForm({ activityCount: event.currentTarget.value })}
        />
      {/snippet}
    </WizardField>
  </div>

  <SdgPicker
    id="wiz-sdgs"
    selected={state.form.sdgIds}
    options={state.references.sdgs}
    error={state.errors.sdgIds}
    onchange={(ids) => state.patchForm({ sdgIds: ids })}
  />
</section>

<style>
  .step-pane {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .two-col {
    display: grid;
    gap: 16px 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

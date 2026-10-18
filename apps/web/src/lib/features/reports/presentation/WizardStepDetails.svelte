<script lang="ts">
  import type { WizardForm } from '../application/wizard-form';
  import type { FieldErrors } from '../application/wizard-validation';
  import WizardDateField from './WizardDateField.svelte';
  import WizardField from './WizardField.svelte';

  /**
   * Step 2 — activity details (UI phase 06 §3). A single-day activity uses the
   * same start and end date; the end-before-start error is inline on the end date.
   */
  let {
    form,
    errors,
    flagged,
    disabled = false,
    onchange,
  }: {
    form: WizardForm;
    errors: FieldErrors;
    /** Fields named in a return comment; only phase 07 sets this. */
    flagged?: ReadonlySet<string>;
    disabled?: boolean;
    onchange: (patch: Partial<WizardForm>) => void;
  } = $props();
</script>

<div class="step-fields">
  <WizardField
    id="wiz-title"
    label="Title of the activity"
    error={errors.title}
    flagged={flagged?.has('title')}
    required
  >
    {#snippet children({ describedBy, invalid })}
      <input
        id="wiz-title"
        class="input"
        type="text"
        value={form.title}
        {disabled}
        maxlength="300"
        autocomplete="off"
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        oninput={(event) => onchange({ title: event.currentTarget.value })}
      />
    {/snippet}
  </WizardField>

  <div class="date-row">
    <WizardDateField
      id="wiz-startDate"
      label="Start date"
      value={form.startDate}
      text={form.startText}
      error={errors.startDate}
      flagged={flagged?.has('startDate')}
      {disabled}
      ontext={(text) => onchange({ startText: text })}
      onchange={(iso) => onchange({ startDate: iso })}
    />
    <span class="date-separator" aria-hidden="true">to</span>
    <WizardDateField
      id="wiz-endDate"
      label="End date"
      value={form.endDate}
      text={form.endText}
      error={errors.endDate}
      flagged={flagged?.has('endDate')}
      {disabled}
      ontext={(text) => onchange({ endText: text })}
      onchange={(iso) => onchange({ endDate: iso })}
    />
  </div>

  <WizardField
    id="wiz-location"
    label="Location"
    error={errors.location}
    flagged={flagged?.has('location')}
    required
    hint="Barangay, municipality, or venue."
  >
    {#snippet children({ describedBy, invalid })}
      <input
        id="wiz-location"
        class="input"
        type="text"
        value={form.location}
        {disabled}
        maxlength="300"
        autocomplete="off"
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        oninput={(event) => onchange({ location: event.currentTarget.value })}
      />
    {/snippet}
  </WizardField>
</div>

<style>
  .step-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .date-row {
    align-items: flex-end;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  }

  .date-separator {
    color: var(--text-secondary);
    font-size: 13px;
    padding-bottom: 8px;
  }
</style>

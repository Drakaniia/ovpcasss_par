<script lang="ts">
  import type { Campus, Department, Office, ReportType, Unit } from '@par/shared';

  import {
    CLASSIFICATION_OPTIONS,
    LEVEL_OPTIONS,
    REPORT_TYPE_OPTIONS,
    unitsForCampus,
    unitLabel,
    type WizardForm,
    type WizardOption,
  } from '../application/wizard-form';
  import type { FieldErrors } from '../application/wizard-validation';
  import WizardDirectorySelect from './WizardDirectorySelect.svelte';
  import WizardField from './WizardField.svelte';

  /**
   * Step 1 — activity classification (UI phase 06 §3). Type comes first because
   * it drives the tracking-number prefix, attachment requirements, and exports.
   * Campus filters the colleges/units and explains a cleared selection inline.
   */
  let {
    form,
    campuses,
    units,
    departments,
    offices,
    errors,
    flagged,
    disabled = false,
    onchange,
  }: {
    form: WizardForm;
    campuses: readonly Campus[];
    units: readonly Unit[];
    departments: readonly Department[];
    offices: readonly Office[];
    errors: FieldErrors;
    /** Fields named in a return comment; only phase 07 sets this. */
    flagged?: ReadonlySet<string>;
    disabled?: boolean;
    onchange: (patch: Partial<WizardForm>) => void;
  } = $props();

  let campusNotice = $state('');

  const campusOptions = $derived<WizardOption[]>(
    [...campuses]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((campus) => ({
        value: campus.id,
        label: campus.isActive ? campus.name : `${campus.name} (inactive)`,
      })),
  );

  const unitChoices = $derived(unitsForCampus(units, form.campusId));
  const unitOptions = $derived<WizardOption[]>(
    unitChoices.map((unit) => ({ value: unit.id, label: unitLabel(unit) })),
  );

  function directoryOptions(entries: readonly Department[]): WizardOption[] {
    return [...entries]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((entry) => ({
        value: entry.name,
        label: entry.isActive ? entry.name : `${entry.name} (inactive)`,
      }));
  }

  const departmentOptions = $derived(directoryOptions(departments));
  const officeOptions = $derived(directoryOptions(offices));

  function selectCampus(campusId: string): void {
    const current = units.find((unit) => unit.id === form.unitId);
    if (current && current.campusId !== campusId) {
      campusNotice =
        'The previous college or unit is not offered at this campus. Select one from this campus.';
      onchange({ campusId, unitId: '' });
      return;
    }

    campusNotice = '';
    onchange({ campusId });
  }

  function selectUnit(unitId: string): void {
    campusNotice = '';
    onchange({ unitId });
  }
</script>

<div class="step-fields">
  <WizardField
    id="wiz-type"
    label="Activity type"
    error={errors.type}
    flagged={flagged?.has('type')}
    required
  >
    {#snippet children({ describedBy, invalid })}
      <select
        id="wiz-type"
        class="select"
        value={form.type}
        {disabled}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onchange={(event) => onchange({ type: event.currentTarget.value as ReportType | '' })}
      >
        <option value="">Select…</option>
        {#each REPORT_TYPE_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {/snippet}
  </WizardField>

  <WizardField
    id="wiz-classification"
    label="Classification"
    error={errors.classification}
    flagged={flagged?.has('classification')}
    required
  >
    {#snippet children({ describedBy, invalid })}
      <select
        id="wiz-classification"
        class="select"
        value={form.classification}
        {disabled}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onchange={(event) =>
          onchange({
            classification: event.currentTarget.value as WizardForm['classification'],
          })}
      >
        <option value="">Select…</option>
        {#each CLASSIFICATION_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {/snippet}
  </WizardField>

  <WizardField
    id="wiz-campusId"
    label="Campus"
    error={errors.campusId}
    flagged={flagged?.has('campusId')}
    required
  >
    {#snippet children({ describedBy, invalid })}
      <select
        id="wiz-campusId"
        class="select"
        value={form.campusId}
        {disabled}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onchange={(event) => selectCampus(event.currentTarget.value)}
      >
        <option value="">Select…</option>
        {#each campusOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {/snippet}
  </WizardField>

  <WizardField
    id="wiz-unitId"
    label="College or unit"
    error={errors.unitId}
    flagged={flagged?.has('unitId')}
    required
    hint={!form.campusId ? 'Select a campus first.' : undefined}
  >
    {#snippet children({ describedBy, invalid })}
      <select
        id="wiz-unitId"
        class="select"
        value={form.unitId}
        disabled={disabled || !form.campusId}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onchange={(event) => selectUnit(event.currentTarget.value)}
      >
        <option value="">Select…</option>
        {#each unitOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      {#if campusNotice}
        <p class="inline-note" role="status">{campusNotice}</p>
      {/if}
    {/snippet}
  </WizardField>

  <WizardDirectorySelect
    id="wiz-department"
    label="Department"
    value={form.department}
    options={departmentOptions}
    error={errors.department}
    flagged={flagged?.has('department')}
    optional
    {disabled}
    onchange={(value) => onchange({ department: value })}
  />

  <WizardDirectorySelect
    id="wiz-office"
    label="Office"
    value={form.office}
    options={officeOptions}
    error={errors.office}
    flagged={flagged?.has('office')}
    optional
    {disabled}
    onchange={(value) => onchange({ office: value })}
  />

  <WizardField
    id="wiz-level"
    label="Level"
    error={errors.level}
    flagged={flagged?.has('level')}
    required
  >
    {#snippet children({ describedBy, invalid })}
      <select
        id="wiz-level"
        class="select"
        value={form.level}
        {disabled}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onchange={(event) => onchange({ level: event.currentTarget.value as WizardForm['level'] })}
      >
        <option value="">Select…</option>
        {#each LEVEL_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {/snippet}
  </WizardField>
</div>

<style>
  .step-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .inline-note {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 4px 0 0;
  }
</style>

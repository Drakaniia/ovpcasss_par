<script lang="ts">
  import type { Campus, Department, Office, ReportType, Unit } from '@par/shared';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import type {
    DirectoryEntity,
    DirectoryEntry,
  } from '$lib/features/admin/application/directory-entries';

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
   *
   * Every control is the shared dropdown, so the same search, keyboard walk, and
   * popover motion apply to the fixed contract lists and the two admin-managed
   * directories alike. Only the directories accept a new value.
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
    canManageDirectories = false,
    onchange,
    onreferencechange,
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
    canManageDirectories?: boolean;
    onchange: (patch: Partial<WizardForm>) => void;
    onreferencechange?: (entity: DirectoryEntity, entries: readonly DirectoryEntry[]) => void;
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
      <EditableSelect
        id="wiz-type"
        label="Activity type"
        value={form.type}
        options={REPORT_TYPE_OPTIONS}
        {describedBy}
        {invalid}
        {disabled}
        onchange={(value) => onchange({ type: value as ReportType | '' })}
      />
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
      <EditableSelect
        id="wiz-classification"
        label="Classification"
        value={form.classification}
        options={CLASSIFICATION_OPTIONS}
        {describedBy}
        {invalid}
        {disabled}
        onchange={(value) => onchange({ classification: value as WizardForm['classification'] })}
      />
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
      <EditableSelect
        id="wiz-campusId"
        label="Campus"
        value={form.campusId}
        options={campusOptions}
        {describedBy}
        {invalid}
        {disabled}
        onchange={selectCampus}
      />
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
      <EditableSelect
        id="wiz-unitId"
        label="College or unit"
        value={form.unitId}
        options={unitOptions}
        {describedBy}
        {invalid}
        disabled={disabled || !form.campusId}
        onchange={selectUnit}
      />

      {#if campusNotice}
        <p class="inline-note" role="status">{campusNotice}</p>
      {/if}
    {/snippet}
  </WizardField>

  <WizardDirectorySelect
    id="wiz-department"
    label="Department"
    value={form.department}
    entity="departments"
    entries={departments}
    error={errors.department}
    flagged={flagged?.has('department')}
    optional
    {disabled}
    canManage={canManageDirectories}
    onchange={(value) => onchange({ department: value })}
    onentrieschange={onreferencechange}
  />

  <WizardDirectorySelect
    id="wiz-office"
    label="Office"
    value={form.office}
    entity="offices"
    entries={offices}
    error={errors.office}
    flagged={flagged?.has('office')}
    optional
    {disabled}
    canManage={canManageDirectories}
    onchange={(value) => onchange({ office: value })}
    onentrieschange={onreferencechange}
  />

  <WizardField
    id="wiz-level"
    label="Level"
    error={errors.level}
    flagged={flagged?.has('level')}
    required
  >
    {#snippet children({ describedBy, invalid })}
      <EditableSelect
        id="wiz-level"
        label="Level"
        value={form.level}
        options={LEVEL_OPTIONS}
        {describedBy}
        {invalid}
        {disabled}
        onchange={(value) => onchange({ level: value as WizardForm['level'] })}
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

  .inline-note {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 4px 0 0;
  }
</style>

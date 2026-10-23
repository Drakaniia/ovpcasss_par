<script lang="ts">
  import type { Classification, Level, ReportType } from '@par/shared';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import { session } from '$lib/session/session.svelte';

  import {
    CLASSIFICATION_OPTIONS,
    LEVEL_OPTIONS,
    REPORT_TYPE_OPTIONS,
    unitLabel,
  } from '../application/record-form';
  import type { RecordFormState } from '../application/record-state.svelte';
  import WizardDirectorySelect from './WizardDirectorySelect.svelte';
  import WizardField from './WizardField.svelte';

  /** Step 1 — the classification facts the office registers before anything else. */
  let { state }: { state: RecordFormState } = $props();

  const canManage = $derived(session.user?.role === 'ADMIN');

  const campusOptions = $derived(
    state.references.campuses.map((campus) => ({
      value: campus.id,
      label: campus.isActive ? campus.name : `${campus.name} (inactive)`,
    })),
  );

  const unitOptions = $derived(
    state.units.map((unit) => ({ value: unit.id, label: unitLabel(unit) })),
  );
</script>

<section id="wizard-step-1" tabindex="-1" aria-labelledby="wizard-step-1-title" class="step-pane">
  <h2 id="wizard-step-1-title" class="visually-hidden">Activity classification</h2>

  <div class="two-col">
    <WizardField id="wiz-type" label="Activity type" required error={state.errors.type}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-type"
          label="Activity type"
          value={state.form.type}
          options={REPORT_TYPE_OPTIONS}
          placeholder="Select the activity type"
          searchable={false}
          {invalid}
          {describedBy}
          onchange={(value) => state.patchForm({ type: value as ReportType })}
        />
      {/snippet}
    </WizardField>

    <WizardField
      id="wiz-classification"
      label="Classification"
      required
      error={state.errors.classification}
    >
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-classification"
          label="Classification"
          value={state.form.classification}
          options={CLASSIFICATION_OPTIONS}
          placeholder="Select the classification"
          searchable={false}
          {invalid}
          {describedBy}
          onchange={(value) => state.patchForm({ classification: value as Classification })}
        />
      {/snippet}
    </WizardField>

    <WizardField id="wiz-campus" label="Campus" required error={state.errors.campusId}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-campus"
          label="Campus"
          value={state.form.campusId}
          options={campusOptions}
          placeholder="Select the campus"
          emptyMessage="No campuses are configured."
          {invalid}
          {describedBy}
          onchange={(value) => state.patchForm({ campusId: value })}
        />
      {/snippet}
    </WizardField>

    <WizardField id="wiz-unit" label="College or unit" required error={state.errors.unitId}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-unit"
          label="College or unit"
          value={state.form.unitId}
          options={unitOptions}
          placeholder={state.form.campusId
            ? 'Select the college or unit'
            : 'Select the campus first'}
          emptyMessage="No units are configured for this campus."
          disabled={!state.form.campusId}
          {invalid}
          {describedBy}
          onchange={(value) => state.patchForm({ unitId: value })}
        />
      {/snippet}
    </WizardField>

    <WizardDirectorySelect
      id="wiz-department"
      label="Department"
      value={state.form.department}
      entity="departments"
      entries={state.references.departments}
      error={state.errors.department}
      optional
      {canManage}
      onchange={(value) => state.patchForm({ department: value })}
      onentrieschange={(entity, entries) => state.setDirectory(entity, entries)}
    />

    <WizardDirectorySelect
      id="wiz-office"
      label="Office"
      value={state.form.office}
      entity="offices"
      entries={state.references.offices}
      error={state.errors.office}
      optional
      {canManage}
      onchange={(value) => state.patchForm({ office: value })}
      onentrieschange={(entity, entries) => state.setDirectory(entity, entries)}
    />

    <WizardField id="wiz-level" label="Level" required error={state.errors.level}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-level"
          label="Level"
          value={state.form.level}
          options={LEVEL_OPTIONS}
          placeholder="Select the level"
          searchable={false}
          {invalid}
          {describedBy}
          onchange={(value) => state.patchForm({ level: value as Level })}
        />
      {/snippet}
    </WizardField>
  </div>
</section>

<style>
  .step-pane {
    display: block;
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

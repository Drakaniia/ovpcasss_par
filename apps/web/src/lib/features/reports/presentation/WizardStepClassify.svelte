<script lang="ts">
  import type { Campus, Classification, Level, ReportType, Unit } from '@par/shared';

  import { api } from '$lib/api/client';
  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import { session } from '$lib/session/session.svelte';

  import {
    CLASSIFICATION_OPTIONS,
    LEVEL_OPTIONS,
    REPORT_TYPE_OPTIONS,
    unitLabel,
  } from '../application/record-form';
  import type { RecordFormState } from '../application/record-state.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import WizardDirectorySelect from './WizardDirectorySelect.svelte';
  import WizardField from './WizardField.svelte';

  /** Step 1 — the classification facts the office registers before anything else. */
  let { state }: { state: RecordFormState } = $props();

  const canManage = $derived(session.user?.role === 'ADMIN');

  const campusOptions = $derived(
    state.references.campuses.map((campus) => ({
      value: campus.id,
      label: campus.isActive ? campus.name : `${campus.name} (inactive)`,
      name: campus.name,
    })),
  );

  const unitOptions = $derived(
    state.units.map((unit) => ({
      value: unit.id,
      label: unitLabel(unit),
      name: unit.name,
    })),
  );

  /* ---------- The official campus and unit lists, editable in place ---------- */

  function nextOrder(entries: readonly { sortOrder: number }[]): number {
    return entries.reduce((highest, entry) => Math.max(highest, entry.sortOrder), 0) + 1;
  }

  /** Reference codes are required; a new entry derives one from its name. */
  function codeFor(name: string): string {
    const code = name
      .trim()
      .toUpperCase()
      .replaceAll(/[^A-Z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '')
      .slice(0, 24);
    return code || 'NEW';
  }

  function replaceCampus(entry: Campus): void {
    state.references.campuses = state.references.campuses.map((campus) =>
      campus.id === entry.id ? entry : campus,
    );
  }

  function replaceUnit(entry: Unit): void {
    state.references.units = state.references.units.map((unit) =>
      unit.id === entry.id ? entry : unit,
    );
  }

  async function createCampus(name: string): Promise<void> {
    const created = await api.admin.referenceData.create('campuses', {
      code: codeFor(name),
      name: name.trim(),
      sortOrder: nextOrder(state.references.campuses),
      isActive: true,
    });
    state.references.campuses = [...state.references.campuses, created];
    state.patchForm({ campusId: created.id });
  }

  async function renameCampus(id: string, name: string): Promise<void> {
    const campus = state.references.campuses.find((entry) => entry.id === id);
    if (!campus) throw new Error('That campus is no longer in the list.');
    replaceCampus(
      await api.admin.referenceData.update('campuses', id, {
        code: campus.code,
        name: name.trim(),
        sortOrder: campus.sortOrder,
        isActive: campus.isActive,
      }),
    );
  }

  async function removeCampus(id: string): Promise<void> {
    const campus = state.references.campuses.find((entry) => entry.id === id);
    if (!campus) throw new Error('That campus is no longer in the list.');
    replaceCampus(await api.admin.referenceData.deactivate('campuses', id));
    toast.success(`${campus.name} removed`, {
      action: {
        label: 'Undo',
        run: () =>
          void api.admin.referenceData
            .activate('campuses', id)
            .then(replaceCampus)
            .then(() => toast.success(`${campus.name} restored`))
            .catch(() => toast.error('The campus was not restored.')),
      },
    });
  }

  async function createUnit(name: string): Promise<void> {
    if (!state.form.campusId) throw new Error('Choose a campus before adding a unit.');
    const created = await api.admin.referenceData.create('units', {
      code: codeFor(name),
      name: name.trim(),
      kind: 'OTHER_UNIT',
      campusId: state.form.campusId,
      sortOrder: nextOrder(state.references.units),
      isActive: true,
    });
    state.references.units = [...state.references.units, created];
    state.patchForm({ unitId: created.id });
  }

  async function renameUnit(id: string, name: string): Promise<void> {
    const unit = state.references.units.find((entry) => entry.id === id);
    if (!unit) throw new Error('That unit is no longer in the list.');
    replaceUnit(
      await api.admin.referenceData.update('units', id, {
        code: unit.code,
        name: name.trim(),
        kind: unit.kind,
        campusId: unit.campusId,
        sortOrder: unit.sortOrder,
        isActive: unit.isActive,
      }),
    );
  }

  async function removeUnit(id: string): Promise<void> {
    const unit = state.references.units.find((entry) => entry.id === id);
    if (!unit) throw new Error('That unit is no longer in the list.');
    replaceUnit(await api.admin.referenceData.deactivate('units', id));
    toast.success(`${unit.name} removed`, {
      action: {
        label: 'Undo',
        run: () =>
          void api.admin.referenceData
            .activate('units', id)
            .then(replaceUnit)
            .then(() => toast.success(`${unit.name} restored`))
            .catch(() => toast.error('The unit was not restored.')),
      },
    });
  }

  const campusManage = $derived(
    canManage
      ? { onCreate: createCampus, onRename: renameCampus, onRemove: removeCampus }
      : undefined,
  );

  const unitManage = $derived(
    canManage ? { onCreate: createUnit, onRename: renameUnit, onRemove: removeUnit } : undefined,
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
          emptyMessage="No campuses are configured. Type a name to add one."
          {invalid}
          {describedBy}
          manage={campusManage}
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
          emptyMessage="No units are configured for this campus. Type a name to add one."
          disabled={!state.form.campusId}
          {invalid}
          {describedBy}
          manage={unitManage}
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

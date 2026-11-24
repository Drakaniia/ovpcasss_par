<script lang="ts">
  import type { Campus, Classification, Level, ReportType, Unit } from '@par/shared';

  import { api } from '$lib/api/client';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
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
  let { state: wizard }: { state: RecordFormState } = $props();

  const isAdmin = $derived(session.user?.role === 'ADMIN');
  const canManage = $derived(isAdmin || session.user?.role === 'PERSONNEL');

  let pendingConfirm = $state<{
    title: string;
    description: string;
    confirmLabel: string;
    run: () => Promise<void>;
    resolve: (err?: unknown) => void;
  } | null>(null);

  function askConfirm(
    title: string,
    description: string,
    confirmLabel: string,
    run: () => Promise<void>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      pendingConfirm = {
        title,
        description,
        confirmLabel,
        run,
        resolve: (err: unknown) => (err ? reject(err) : resolve()),
      };
    });
  }

  const campusOptions = $derived(
    wizard.references.campuses.map((campus) => ({
      value: campus.id,
      label: campus.isActive ? campus.name : `${campus.name} (inactive)`,
      name: campus.name,
    })),
  );

  const unitOptions = $derived(
    wizard.units.map((unit) => ({
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
    wizard.references.campuses = wizard.references.campuses.map((campus) =>
      campus.id === entry.id ? entry : campus,
    );
  }

  function replaceUnit(entry: Unit): void {
    wizard.references.units = wizard.references.units.map((unit) =>
      unit.id === entry.id ? entry : unit,
    );
  }

  async function createCampus(name: string): Promise<void> {
    await askConfirm(
      'Add campus',
      `Add "${name.trim()}" to the shared campus list?`,
      'Add campus',
      async () => {
        const created = await api.admin.referenceData.create('campuses', {
          code: codeFor(name),
          name: name.trim(),
          sortOrder: nextOrder(wizard.references.campuses),
          isActive: true,
        });
        wizard.references.campuses = [...wizard.references.campuses, created];
        wizard.patchForm({ campusId: created.id });
      },
    );
  }

  async function renameCampus(id: string, name: string): Promise<void> {
    const campus = wizard.references.campuses.find((entry) => entry.id === id);
    if (!campus) throw new Error('That campus is no longer in the list.');
    await askConfirm(
      'Update campus',
      `Rename "${campus.name}" to "${name.trim()}" in the shared campus list?`,
      'Save change',
      async () => {
        replaceCampus(
          await api.admin.referenceData.update('campuses', id, {
            code: campus.code,
            name: name.trim(),
            sortOrder: campus.sortOrder,
            isActive: campus.isActive,
          }),
        );
      },
    );
  }

  async function removeCampus(id: string): Promise<void> {
    const campus = wizard.references.campuses.find((entry) => entry.id === id);
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
    if (!wizard.form.campusId) throw new Error('Choose a campus before adding an entry.');
    const campus = wizard.references.campuses.find((entry) => entry.id === wizard.form.campusId);
    const kind = campus?.code === 'SATELLITE' ? 'SATELLITE_CAMPUS' : 'COLLEGE';
    await askConfirm(
      'Add college or satellite campus',
      `Add "${name.trim()}" to the shared colleges / satellite campuses list?`,
      'Add entry',
      async () => {
        const created = await api.admin.referenceData.create('units', {
          code: codeFor(name),
          name: name.trim(),
          kind,
          campusId: wizard.form.campusId,
          sortOrder: nextOrder(wizard.references.units),
          isActive: true,
        });
        wizard.references.units = [...wizard.references.units, created];
        wizard.patchForm({ unitId: created.id });
      },
    );
  }

  async function renameUnit(id: string, name: string): Promise<void> {
    const unit = wizard.references.units.find((entry) => entry.id === id);
    if (!unit) throw new Error('That entry is no longer in the list.');
    await askConfirm(
      'Update college or satellite campus',
      `Rename "${unit.name}" to "${name.trim()}" in the shared list?`,
      'Save change',
      async () => {
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
      },
    );
  }

  async function removeUnit(id: string): Promise<void> {
    const unit = wizard.references.units.find((entry) => entry.id === id);
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
      ? {
          onCreate: createCampus,
          onRename: renameCampus,
          ...(isAdmin ? { onRemove: removeCampus } : {}),
        }
      : undefined,
  );

  const unitManage = $derived(
    canManage
      ? {
          onCreate: createUnit,
          onRename: renameUnit,
          ...(isAdmin ? { onRemove: removeUnit } : {}),
        }
      : undefined,
  );
</script>

<section id="wizard-step-1" tabindex="-1" aria-labelledby="wizard-step-1-title" class="step-pane">
  <h2 id="wizard-step-1-title" class="visually-hidden">Activity classification</h2>

  <div class="two-col">
    <WizardField id="wiz-type" label="Activity type" required error={wizard.errors.type}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-type"
          label="Activity type"
          value={wizard.form.type}
          options={REPORT_TYPE_OPTIONS}
          placeholder="Select the activity type"
          searchable={false}
          {invalid}
          {describedBy}
          onchange={(value) => wizard.patchForm({ type: value as ReportType })}
        />
      {/snippet}
    </WizardField>

    <WizardField id="wiz-tracking-number" label="Tracking number" error={wizard.errors.trackingNumber}>
      {#snippet children({ describedBy, invalid })}
        <input
          id="wiz-tracking-number"
          class="input"
          type="text"
          maxlength="80"
          placeholder="Optional tracking slip number"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          value={wizard.form.trackingNumber}
          oninput={(event) => wizard.patchForm({ trackingNumber: event.currentTarget.value })}
        />
      {/snippet}
    </WizardField>

    <WizardField
      id="wiz-classification"
      label="Classification"
      required
      error={wizard.errors.classification}
    >
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-classification"
          label="Classification"
          value={wizard.form.classification}
          options={CLASSIFICATION_OPTIONS}
          placeholder="Select the classification"
          searchable={false}
          {invalid}
          {describedBy}
          onchange={(value) => wizard.patchForm({ classification: value as Classification })}
        />
      {/snippet}
    </WizardField>

    <WizardField id="wiz-campus" label="Campus" error={wizard.errors.campusId}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-campus"
          label="Campus"
          value={wizard.form.campusId}
          options={campusOptions}
          placeholder="Select the campus"
          emptyMessage="No campuses are configured. Type a name to add one."
          {invalid}
          {describedBy}
          manage={campusManage}
          onchange={(value) => wizard.patchForm({ campusId: value })}
        />
      {/snippet}
    </WizardField>

    <WizardField id="wiz-unit" label="Colleges / Satellite Campus" error={wizard.errors.unitId}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-unit"
          label="Colleges / Satellite Campus"
          value={wizard.form.unitId}
          options={unitOptions}
          placeholder="Select the college or satellite campus"
          emptyMessage="No entries are configured yet. Type a name to add one."
          {invalid}
          {describedBy}
          manage={unitManage}
          onchange={(value) => wizard.patchForm({ unitId: value })}
        />
      {/snippet}
    </WizardField>

    <WizardDirectorySelect
      id="wiz-department"
      label="Department / Program"
      value={wizard.form.department}
      entity="departments"
      entries={wizard.references.departments}
      error={wizard.errors.department}
      {canManage}
      canRemove={isAdmin}
      confirmManage={canManage}
      onchange={(value) => wizard.patchForm({ department: value })}
      onentrieschange={(entity, entries) => wizard.setDirectory(entity, entries)}
    />

    <WizardDirectorySelect
      id="wiz-office"
      label="Office / Unit"
      value={wizard.form.office}
      entity="offices"
      entries={wizard.references.offices}
      error={wizard.errors.office}
      {canManage}
      canRemove={isAdmin}
      confirmManage={canManage}
      onchange={(value) => wizard.patchForm({ office: value })}
      onentrieschange={(entity, entries) => wizard.setDirectory(entity, entries)}
    />

    <WizardField id="wiz-level" label="Graduate / Undergraduate" required error={wizard.errors.level}>
      {#snippet children({ describedBy, invalid })}
        <EditableSelect
          id="wiz-level"
          label="Graduate / Undergraduate"
          value={wizard.form.level}
          options={LEVEL_OPTIONS}
          placeholder="Select the level"
          searchable={false}
          {invalid}
          {describedBy}
          onchange={(value) => wizard.patchForm({ level: value as Level })}
        />
      {/snippet}
    </WizardField>
  </div>
</section>

<ConfirmDialog
  open={Boolean(pendingConfirm)}
  title={pendingConfirm?.title ?? ''}
  description={pendingConfirm?.description ?? ''}
  confirmLabel={pendingConfirm?.confirmLabel ?? 'Confirm'}
  onconfirm={() => {
    const job = pendingConfirm;
    pendingConfirm = null;
    if (!job) return;
    void job.run().then(
      () => job.resolve(),
      (err: unknown) => job.resolve(err),
    );
  }}
  oncancel={() => {
    const job = pendingConfirm;
    pendingConfirm = null;
    job?.resolve();
  }}
/>

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

<script lang="ts">
  import type { ReferenceEntry, ReferenceInput } from '@par/shared';
  import { AlertCircle } from '@lucide/svelte';
  import { tick, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import SideDrawer from '$lib/components/SideDrawer.svelte';

  import { optionsForField } from '../application/reference-entities';
  import {
    deactivationFor,
    drawerTitle,
    findDuplicate,
    savedMessage,
    validateDraft,
    type DuplicateMatch,
  } from '../application/reference-data';
  import type {
    ReferenceDraft,
    ReferenceDraftValues,
    ReferenceEntityConfig,
    ReferenceField,
    ReferenceFieldValue,
    ReferenceRelated,
    ReferenceRow,
  } from '../application/reference-types';
  import ReferenceEntryField from './ReferenceEntryField.svelte';
  import ReferenceEntryFooter from './ReferenceEntryFooter.svelte';
  import SeededChip from './SeededChip.svelte';

  let {
    config,
    draft,
    rows,
    related,
    onclose,
    onchanged,
  }: {
    config: ReferenceEntityConfig;
    draft: ReferenceDraft;
    rows: readonly ReferenceRow[];
    related: ReferenceRelated;
    onclose: () => void;
    onchanged: (entry: ReferenceEntry, message: string) => void;
  } = $props();

  const idPrefix = $props.id();

  let values = $state<ReferenceDraftValues>(untrack(() => ({ ...draft.values })));
  let touched = $state<Record<string, boolean>>({});
  let submitted = $state(false);
  let alert = $state<{ message: string; requestId?: string } | null>(null);
  let busy = $state<'save' | 'deactivate' | 'activate' | null>(null);
  let summaryEl = $state<HTMLElement | null>(null);
  let alertEl = $state<HTMLElement | null>(null);
  let duplicateMatch = $state<DuplicateMatch | null>(null);
  let duplicateOpen = $state(false);
  let pendingSave = $state<ReferenceInput | null>(null);
  let deactivateOpen = $state(false);

  const validation = $derived(validateDraft(config, values));
  const errors = $derived(validation.errors);
  const errorEntries = $derived(
    config.fields
      .filter((field) => submitted && errors[field.name])
      .map((field) => ({ field, message: errors[field.name] })),
  );
  const row = $derived(draft.id ? (rows.find((item) => item.id === draft.id) ?? null) : null);
  const deactivation = $derived(row ? deactivationFor(config, row) : null);
  const note = $derived(config.note?.(values));

  function fieldId(name: string): string {
    return `${idPrefix}-${name}`;
  }

  function options(field: ReferenceField) {
    return optionsForField(config, field.name, rows, related, draft.id);
  }

  function hint(field: ReferenceField): string | undefined {
    if (field.name === 'campusId' && (related.campuses?.length ?? 0) === 0) {
      return 'No campuses are available. Add a campus first.';
    }
    if (field.name === 'unitId' && (related.units?.length ?? 0) === 0) {
      return 'No units are available. Add a unit first.';
    }
    return undefined;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    submitted = true;

    if (Object.keys(errors).length > 0) {
      await tick();
      summaryEl?.focus();
      return;
    }

    const input = validation.input;
    if (!input) return;

    const duplicate = findDuplicate(config, rows, values, draft.id);
    if (duplicate) {
      duplicateMatch = duplicate;
      pendingSave = input;
      duplicateOpen = true;
      return;
    }

    await save(input);
  }

  async function save(input: ReferenceInput) {
    if (busy) return;

    busy = 'save';
    alert = null;

    try {
      const entry = draft.id
        ? await api.admin.referenceData.update(config.key, draft.id, input)
        : await api.admin.referenceData.create(config.key, input);
      onchanged(entry, savedMessage(config));
    } catch (error) {
      await handleFailure(error, 'We could not save this entry. Try again.');
    } finally {
      busy = null;
    }
  }

  async function deactivate() {
    if (!draft.id || busy) return;

    busy = 'deactivate';
    alert = null;

    try {
      const entry = await api.admin.referenceData.deactivate(config.key, draft.id);
      onchanged(entry, 'Entry deactivated');
    } catch (error) {
      await handleFailure(error, 'We could not deactivate this entry. Try again.');
    } finally {
      busy = null;
    }
  }

  async function activate() {
    if (!draft.id || busy) return;

    busy = 'activate';
    alert = null;

    try {
      const entry = await api.admin.referenceData.activate(config.key, draft.id);
      onchanged(entry, 'Entry activated');
    } catch (error) {
      await handleFailure(error, 'We could not activate this entry. Try again.');
    } finally {
      busy = null;
    }
  }

  /** A concurrent edit wins: show the server's values and ask for a review. */
  async function handleFailure(error: unknown, fallback: string) {
    if (error instanceof ApiError && error.status === 409 && draft.id) {
      try {
        const fresh = await api.admin.referenceData.get(config.key, draft.id);
        values = config.valuesFrom(fresh);
        touched = {};
        submitted = false;
        alert = {
          message:
            'This entry changed since you opened it. The current values are shown; review them before saving again.',
        };
      } catch {
        alert = {
          message:
            'This entry changed since you opened it. Close the drawer and open it again to review the current values.',
        };
      }
    } else {
      alert = {
        message: error instanceof ApiError ? error.message : fallback,
        requestId: error instanceof ApiError ? error.requestId : undefined,
      };
    }

    await tick();
    alertEl?.focus();
  }

  function setValue(name: string, value: ReferenceFieldValue) {
    values[name] = value;
  }

  function focusField(name: string) {
    document.getElementById(fieldId(name))?.focus();
  }

  function confirmDuplicate() {
    const input = pendingSave;
    duplicateMatch = null;
    pendingSave = null;
    if (input) void save(input);
  }
</script>

<SideDrawer open={true} title={drawerTitle(config, draft)} subtitle={config.label} {onclose}>
  <form class="entry-form" novalidate onsubmit={submit}>
    {#if draft.isSeeded}
      <div class="seeded-note">
        <SeededChip />
        <p>Seeded from the source workbook. Deactivate rather than delete.</p>
      </div>
    {/if}

    {#if alert}
      <div class="form-alert" role="alert" tabindex="-1" bind:this={alertEl}>
        <AlertCircle size={16} aria-hidden="true" />
        <div class="form-alert-body">
          {alert.message}
          {#if alert.requestId}
            <p class="request-id">Request ID: <span class="mono">{alert.requestId}</span></p>
          {/if}
        </div>
      </div>
    {/if}

    {#if errorEntries.length > 0}
      <div class="error-summary" role="alert" tabindex="-1" bind:this={summaryEl}>
        <p>Check the highlighted fields and try again.</p>
        <ul>
          {#each errorEntries as entry (entry.field.name)}
            <li>
              <a
                href="#{fieldId(entry.field.name)}"
                onclick={(event) => {
                  event.preventDefault();
                  focusField(entry.field.name);
                }}>{entry.field.label}: {entry.message}</a
              >
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if draft.isCurrent}
      <p class="drawer-note">
        This term is current. Another term must be made current before this one can be deactivated.
      </p>
    {/if}

    <div class="fields">
      {#each config.fields as field (field.name)}
        <ReferenceEntryField
          {field}
          value={values[field.name]}
          id={fieldId(field.name)}
          error={(touched[field.name] || submitted) && errors[field.name]
            ? errors[field.name]
            : undefined}
          disabled={busy !== null || Boolean(field.immutableOnEdit && draft.id)}
          hint={hint(field)}
          options={options(field)}
          onchange={(value) => setValue(field.name, value)}
          onblur={() => (touched[field.name] = true)}
        />
      {/each}
    </div>

    {#if note}
      <p class="drawer-note">{note}</p>
    {/if}

    <ReferenceEntryFooter
      {idPrefix}
      existing={Boolean(draft.id && row)}
      isActive={row?.isActive ?? true}
      {busy}
      blockedReason={draft.blockedReason}
      oncancel={onclose}
      ondeactivate={() => (deactivateOpen = true)}
      onactivate={() => void activate()}
    />
  </form>
</SideDrawer>

{#if duplicateMatch}
  <ConfirmDialog
    bind:open={duplicateOpen}
    title="Duplicate entry"
    description={duplicateMatch.message}
    confirmLabel="Save anyway"
    onconfirm={confirmDuplicate}
    oncancel={() => {
      duplicateMatch = null;
      pendingSave = null;
    }}
  />
{/if}

{#if deactivation}
  <ConfirmDialog
    bind:open={deactivateOpen}
    title={deactivation.title}
    description={deactivation.description}
    confirmLabel={deactivation.confirmLabel}
    tone="destructive"
    onconfirm={() => void deactivate()}
  />
{/if}

<style>
  .entry-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .seeded-note {
    align-items: flex-start;
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    gap: 10px;
    padding: 12px;
  }

  .seeded-note p {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }

  .error-summary p {
    margin: 0 0 6px;
  }

  .error-summary ul {
    margin: 0;
    padding-left: 18px;
  }

  .error-summary a {
    color: inherit;
  }

  .request-id {
    font-size: 12px;
    margin: 4px 0 0;
  }

  .mono {
    font-family: var(--font-mono);
  }

  .drawer-note {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>

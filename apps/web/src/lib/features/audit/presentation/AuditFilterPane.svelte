<script lang="ts">
  import { untrack } from 'svelte';

  import DatePicker from '$lib/components/DatePicker.svelte';
  import EditableSelect from '$lib/components/EditableSelect.svelte';

  import {
    filtersToParams,
    validateDateRange,
    type AuditFilters,
  } from '../application/audit-filters';

  let {
    filters,
    onapply,
    onreset,
    disabled = false,
  }: {
    filters: AuditFilters;
    onapply: (draft: AuditFilters) => void;
    onreset: () => void;
    disabled?: boolean;
  } = $props();

  let draft = $state<AuditFilters>(untrack(() => ({ ...filters })));
  let lastApplied = untrack(() => filtersToParams(filters));

  $effect(() => {
    const applied = filtersToParams(filters);
    if (applied === lastApplied) return;
    lastApplied = applied;
    draft = { ...filters };
  });

  const dateValidation = $derived(validateDateRange(draft.from, draft.to));

  const ACTION_OPTIONS = [
    { value: '', label: 'All actions' },
    { value: 'REGISTER', label: 'Registered' },
    { value: 'LOGIN', label: 'Logged in' },
    { value: 'LOGIN_FAILED', label: 'Login failed' },
    { value: 'PASSWORD_RESET_REQUESTED', label: 'Password reset requested' },
    { value: 'PASSWORD_RESET', label: 'Password reset' },
    { value: 'ROLE_ASSIGNED', label: 'Role changed' },
    { value: 'USER_APPROVED', label: 'User approved' },
    { value: 'USER_DISABLED', label: 'User disabled' },
    { value: 'PROFILE_UPDATED', label: 'Profile updated' },
    { value: 'SIGNATURE_UPDATED', label: 'Signature updated' },
    { value: 'SIGNATURE_REMOVED', label: 'Signature removed' },
    { value: 'SIGNATURE_ATTACHED', label: 'Signature attached to a record' },
    { value: 'RECORD_CREATED', label: 'Record created' },
    { value: 'RECORD_UPDATED', label: 'Record updated' },
    { value: 'RECORD_DELETED', label: 'Record deleted' },
    { value: 'RECORD_RENUMBERED', label: 'Record renumbered' },
    { value: 'PIC_ASSIGNED', label: 'Personnel in charge assigned' },
    { value: 'PIC_REMOVED', label: 'Personnel in charge removed' },
    { value: 'NARRATIVE_SAVED', label: 'Narrative saved' },
    { value: 'NARRATIVE_SUBMITTED', label: 'Narrative submitted' },
    { value: 'NARRATIVE_RETURNED', label: 'Narrative returned' },
    { value: 'NARRATIVE_APPROVED', label: 'Narrative approved' },
    { value: 'RECEIPT_ISSUED', label: 'Receipt issued' },
    { value: 'RECORD_ARCHIVED', label: 'Record archived' },
    { value: 'RECORD_UNARCHIVED', label: 'Record unarchived' },
    { value: 'REGISTER_EXPORTED', label: 'Register exported' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'EXPORTED', label: 'Exported' },
    { value: 'REFERENCE_SEEDED', label: 'Reference data seeded' },
    { value: 'REFERENCE_CREATED', label: 'Reference data created' },
    { value: 'REFERENCE_UPDATED', label: 'Reference data updated' },
    { value: 'REFERENCE_DEACTIVATED', label: 'Reference data deactivated' },
    { value: 'REFERENCE_ACTIVATED', label: 'Reference data activated' },
    { value: 'ATTACHMENT_ADDED', label: 'Attachment added' },
    { value: 'ATTACHMENT_REMOVED', label: 'Attachment removed' },
  ];

  const ENTITY_OPTIONS = [
    { value: '', label: 'All entity types' },
    { value: 'user', label: 'User' },
    { value: 'report', label: 'Report' },
    { value: 'attachment', label: 'Attachment' },
    { value: 'reference_data', label: 'Reference data' },
    { value: 'export', label: 'Export' },
    { value: 'session', label: 'Session' },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: 'Any status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'DRAFT', label: 'Draft (legacy)' },
    { value: 'RECORD_CREATED', label: 'Record created' },
    { value: 'RECORD_UPDATED', label: 'Record updated' },
    { value: 'RECORD_DELETED', label: 'Record deleted' },
    { value: 'RECORD_RENUMBERED', label: 'Record renumbered' },
    { value: 'PIC_ASSIGNED', label: 'Personnel in charge assigned' },
    { value: 'PIC_REMOVED', label: 'Personnel in charge removed' },
    { value: 'NARRATIVE_SAVED', label: 'Narrative saved' },
    { value: 'NARRATIVE_SUBMITTED', label: 'Narrative submitted' },
    { value: 'NARRATIVE_RETURNED', label: 'Narrative returned' },
    { value: 'NARRATIVE_APPROVED', label: 'Narrative approved' },
    { value: 'RECEIPT_ISSUED', label: 'Receipt issued' },
    { value: 'RECORD_ARCHIVED', label: 'Record archived' },
    { value: 'RECORD_UNARCHIVED', label: 'Record unarchived' },
    { value: 'REGISTER_EXPORTED', label: 'Register exported' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'APPROVED', label: 'Approved' },
  ];

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!dateValidation.valid) return;
    onapply({ ...draft, page: 1 });
  }

  function handleReset() {
    onreset();
  }
</script>

<form class="audit-filter-pane" onsubmit={handleSubmit} aria-label="Audit filters">
  <div class="filter-pane-header">
    <h2 class="filter-pane-title">FILTERS</h2>
  </div>

  <div class="filter-fields">
    <div class="field-group">
      <label class="field-label" for="filter-actor">Actor</label>
      <input
        class="field-input"
        id="filter-actor"
        type="text"
        placeholder="Name or email"
        bind:value={draft.actor}
        {disabled}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="filter-action">Action</label>
      <EditableSelect
        id="filter-action"
        label="Action"
        placeholder="All actions"
        value={draft.action}
        options={ACTION_OPTIONS}
        {disabled}
        onchange={(value) => (draft.action = value)}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="filter-entity-type">Entity type</label>
      <EditableSelect
        id="filter-entity-type"
        label="Entity type"
        placeholder="All entity types"
        value={draft.entityType}
        options={ENTITY_OPTIONS}
        searchable={false}
        {disabled}
        onchange={(value) => (draft.entityType = value)}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="filter-entity-id">Entity ID</label>
      <input
        class="field-input"
        id="filter-entity-id"
        type="text"
        placeholder="Exact ID"
        bind:value={draft.entityId}
        {disabled}
      />
    </div>

    <fieldset class="fieldset-group">
      <legend class="field-label">Date range (Asia/Manila)</legend>
      <div class="date-inputs">
        <div class="date-col">
          <label class="sub-label" for="filter-date-from">From</label>
          <DatePicker
            id="filter-date-from"
            label="From date"
            value={draft.from}
            {disabled}
            dense
            invalid={!dateValidation.valid}
            describedBy={!dateValidation.valid ? 'filter-date-error' : undefined}
            onchange={(iso) => (draft.from = iso)}
          />
        </div>
        <div class="date-col">
          <label class="sub-label" for="filter-date-to">To</label>
          <DatePicker
            id="filter-date-to"
            label="To date"
            value={draft.to}
            {disabled}
            dense
            invalid={!dateValidation.valid}
            describedBy={!dateValidation.valid ? 'filter-date-error' : undefined}
            onchange={(iso) => (draft.to = iso)}
          />
        </div>
      </div>
      {#if !dateValidation.valid}
        <p class="inline-error" id="filter-date-error" role="alert">{dateValidation.error}</p>
      {/if}
    </fieldset>

    <fieldset class="fieldset-group">
      <legend class="field-label">Status change</legend>
      <div class="status-inputs">
        <div class="status-col">
          <label class="sub-label" for="filter-from-status">From</label>
          <EditableSelect
            id="filter-from-status"
            label="From status"
            placeholder="Any status"
            value={draft.fromStatus}
            options={STATUS_OPTIONS}
            searchable={false}
            {disabled}
            onchange={(value) => (draft.fromStatus = value)}
          />
        </div>
        <div class="status-col">
          <label class="sub-label" for="filter-to-status">To</label>
          <EditableSelect
            id="filter-to-status"
            label="To status"
            placeholder="Any status"
            value={draft.toStatus}
            options={STATUS_OPTIONS}
            searchable={false}
            {disabled}
            onchange={(value) => (draft.toStatus = value)}
          />
        </div>
      </div>
    </fieldset>
  </div>

  <div class="filter-actions">
    <button class="btn btn-primary" type="submit" disabled={!dateValidation.valid || disabled}>
      Apply
    </button>
    <button class="btn btn-outline" type="button" onclick={handleReset} {disabled}> Reset </button>
  </div>
</form>

<style>
  .audit-filter-pane {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    width: 100%;
  }

  .filter-pane-header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .filter-pane-title {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin: 0;
  }

  .filter-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .fieldset-group {
    border: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    /* A fieldset defaults to min-inline-size: min-content, which would let the
       pane's own controls set the pane's width. */
    min-width: 0;
    padding: 0;
  }

  .field-label {
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
  }

  .sub-label {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .field-input {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    color: var(--text-primary);
    font-size: 13px;
    height: 36px;
    padding: 0 10px;
    width: 100%;
  }

  .field-input:focus {
    border-color: var(--primary);
    outline: 2px solid var(--focus-ring);
  }

  /* Stacked: two date inputs side by side cannot both show "DD MMM YYYY" inside
     the 320 px pane, and a clipped placeholder is unreadable. */
  .date-inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .date-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .status-inputs {
    display: grid;
    gap: 8px;
    grid-template-columns: 1fr 1fr;
  }

  .status-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .inline-error {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .filter-actions {
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    padding-top: 16px;
  }

  .filter-actions .btn {
    flex: 1;
  }
</style>

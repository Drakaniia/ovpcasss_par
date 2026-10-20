<script lang="ts">
  import { untrack } from 'svelte';

  import DatePicker from '$lib/components/DatePicker.svelte';

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
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'RESUBMITTED', label: 'Resubmitted' },
    { value: 'RETURNED_BY_REVIEWER', label: 'Returned by reviewer' },
    { value: 'RETURNED_BY_APPROVER', label: 'Returned by approver' },
    { value: 'ENDORSED', label: 'Endorsed' },
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
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'RESUBMITTED', label: 'Resubmitted' },
    { value: 'RETURNED_BY_REVIEWER', label: 'Returned by reviewer' },
    { value: 'RETURNED_BY_APPROVER', label: 'Returned by approver' },
    { value: 'ENDORSED', label: 'Endorsed' },
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
      <select class="field-select" id="filter-action" bind:value={draft.action} {disabled}>
        {#each ACTION_OPTIONS as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="field-group">
      <label class="field-label" for="filter-entity-type">Entity type</label>
      <select class="field-select" id="filter-entity-type" bind:value={draft.entityType} {disabled}>
        {#each ENTITY_OPTIONS as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
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
          <label class="sr-only" for="filter-date-from">From date</label>
          <DatePicker
            id="filter-date-from"
            label="From date"
            value={draft.from}
            disabled={disabled}
            dense
            invalid={!dateValidation.valid}
            describedBy={!dateValidation.valid ? 'filter-date-error' : undefined}
            onchange={(iso) => (draft.from = iso)}
          />
        </div>
        <span class="date-sep" aria-hidden="true">–</span>
        <div class="date-col">
          <label class="sr-only" for="filter-date-to">To date</label>
          <DatePicker
            id="filter-date-to"
            label="To date"
            value={draft.to}
            disabled={disabled}
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
          <select
            class="field-select"
            id="filter-from-status"
            aria-label="From status"
            bind:value={draft.fromStatus}
            {disabled}
          >
            {#each STATUS_OPTIONS as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="status-col">
          <label class="sub-label" for="filter-to-status">To</label>
          <select
            class="field-select"
            id="filter-to-status"
            aria-label="To status"
            bind:value={draft.toStatus}
            {disabled}
          >
            {#each STATUS_OPTIONS as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
      </div>
    </fieldset>
  </div>

  <div class="filter-actions">
    <button
      class="btn btn-primary"
      type="submit"
      disabled={!dateValidation.valid || disabled}
    >
      Apply
    </button>
    <button class="btn btn-outline" type="button" onclick={handleReset} {disabled}>
      Reset
    </button>
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

  .field-input,
  .field-select {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    color: var(--text-primary);
    font-size: 13px;
    height: 36px;
    padding: 0 10px;
    width: 100%;
  }

  .field-input:focus,
  .field-select:focus {
    border-color: var(--primary);
    outline: 2px solid var(--focus-ring);
  }

  .date-inputs {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .date-col {
    flex: 1;
    min-width: 0;
  }

  .date-sep {
    color: var(--text-secondary);
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

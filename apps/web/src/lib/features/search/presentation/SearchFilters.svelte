<script lang="ts">
  import type {
    Classification,
    Level,
    ReportFilterOption,
    ReportType,
    RepositoryFacets,
    RepositoryStatus,
  } from '@par/shared';
  import { REPOSITORY_STATUSES, REPORT_TYPES } from '@par/shared';
  import { RotateCcw } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
  import {
    CLASSIFICATION_OPTIONS,
    LEVEL_OPTIONS,
  } from '$lib/features/reports/application/record-form';

  import { statusLabel } from '../application/repository-chips';
  import {
    clearedFilters,
    hasErrors,
    validateFilters,
    type RepositoryFilterErrors,
  } from '../application/repository-filter-scope';
  import {
    DEFAULT_REPOSITORY_FILTERS,
    filtersToParams,
    type RepositoryFilters,
  } from '../application/repository-filters';
  import { optionsWithCurrent } from '../application/repository-rows';
  import SearchDateRange from './SearchDateRange.svelte';
  import SearchSdgField from './SearchSdgField.svelte';

  /**
   * The repository filter panel (UI spec §7.11). Three columns at ≥1280 px, every
   * field in the spec's table, an inverted date range blocking Apply with an
   * inline error, and no Draft in the status list. The panel edits a draft; only
   * Apply writes the URL, so the panel stays usable while results reload.
   */
  let {
    filters,
    facets = null,
    open,
    onapply,
  }: {
    filters: RepositoryFilters;
    facets?: RepositoryFacets | null;
    open: boolean;
    onapply: (patch: Partial<RepositoryFilters>) => void;
  } = $props();

  let draft = $state<RepositoryFilters>(untrack(() => ({ ...filters })));
  let errors = $state<RepositoryFilterErrors>({});
  let lastApplied = untrack(() => filtersToParams(filters));

  // URL changes (Clear, Back, a chip removal) replace the draft.
  $effect(() => {
    const applied = filtersToParams(filters);
    if (applied === lastApplied) return;
    lastApplied = applied;
    draft = { ...filters };
    errors = {};
  });

  function set<K extends keyof RepositoryFilters>(key: K, value: RepositoryFilters[K]) {
    draft = { ...draft, [key]: value };
  }

  /** An inverted range blocks Apply; the fields carry the message (§2). */
  function apply(event: SubmitEvent) {
    event.preventDefault();

    const found = validateFilters(draft);
    errors = found;
    if (hasErrors(found)) return;

    onapply({ ...draft, page: 1 });
  }

  /** Reset clears the panel's fields, keeping the default status (§2). */
  function reset() {
    draft = { ...clearedFilters(DEFAULT_REPOSITORY_FILTERS), sort: filters.sort, dir: filters.dir };
    errors = {};
  }

  /** The panel's two ranges map onto their own `from`/`to` pairs. */
  function setRange(name: 'received' | 'activity', range: { from: string; to: string }) {
    draft =
      name === 'received'
        ? { ...draft, receivedFrom: range.from, receivedTo: range.to }
        : { ...draft, activityFrom: range.from, activityTo: range.to };
  }

  const options = (entries: readonly ReportFilterOption[] | undefined) => entries ?? [];

  const TYPE_OPTIONS = [
    { value: '', label: 'All types' },
    ...REPORT_TYPES.map((type) => ({ value: type, label: REPORT_TYPE_LABELS[type] })),
  ];

  const CLASSIFICATION_SELECT = [
    { value: '', label: 'All classifications' },
    ...CLASSIFICATION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ];

  const LEVEL_SELECT = [
    { value: '', label: 'All levels' },
    ...LEVEL_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ];

  const STATUS_OPTIONS = REPOSITORY_STATUSES.map((status) => ({
    value: status,
    label: statusLabel(status),
  }));

  /** Facet rows, plus the row that clears the filter. */
  function facetOptions(
    entries: readonly ReportFilterOption[] | undefined,
    current: string,
    allLabel: string,
  ): { value: string; label: string }[] {
    return [
      { value: '', label: allLabel },
      ...optionsWithCurrent(options(entries), current).map((entry) => ({
        value: entry.id,
        label: entry.isActive ? entry.label : `${entry.label} (inactive)`,
      })),
    ];
  }

  const campusOptions = $derived(facetOptions(facets?.campuses, draft.campusId, 'All campuses'));
  const collegeOptions = $derived(
    facetOptions(facets?.colleges, draft.collegeId, 'All colleges and units'),
  );
  const termOptions = $derived(facetOptions(facets?.terms, draft.termId, 'All terms'));
</script>

<div class="panel" class:is-open={open} id="repository-filter-panel">
  <form onsubmit={apply} aria-label="Repository filters">
    <div class="grid">
      <label class="field">
        <span class="field-label">AR No.</span>
        <input
          class="input"
          type="text"
          value={draft.reference}
          maxlength="40"
          autocomplete="off"
          oninput={(event) => set('reference', event.currentTarget.value)}
        />
      </label>

      <label class="field">
        <span class="field-label">Title</span>
        <input
          class="input"
          type="text"
          value={draft.title}
          maxlength="300"
          autocomplete="off"
          oninput={(event) => set('title', event.currentTarget.value)}
        />
      </label>

      <label class="field">
        <span class="field-label">Type</span>
        <EditableSelect
          id="repository-type"
          label="Type"
          placeholder="All types"
          value={draft.type}
          options={TYPE_OPTIONS}
          searchable={false}
          onchange={(value) => set('type', value as ReportType | '')}
        />
      </label>

      <label class="field">
        <span class="field-label">Classification</span>
        <EditableSelect
          id="repository-classification"
          label="Classification"
          placeholder="All classifications"
          value={draft.classification}
          options={CLASSIFICATION_SELECT}
          searchable={false}
          onchange={(value) => set('classification', value as Classification | '')}
        />
      </label>

      <label class="field">
        <span class="field-label">Campus</span>
        <EditableSelect
          id="repository-campus"
          label="Campus"
          placeholder="All campuses"
          value={draft.campusId}
          options={campusOptions}
          onchange={(value) => set('campusId', value)}
        />
      </label>

      <label class="field">
        <span class="field-label">College or unit</span>
        <EditableSelect
          id="repository-college"
          label="College or unit"
          placeholder="All colleges and units"
          value={draft.collegeId}
          options={collegeOptions}
          onchange={(value) => set('collegeId', value)}
        />
      </label>

      <label class="field">
        <span class="field-label">Term</span>
        <EditableSelect
          id="repository-term"
          label="Term"
          placeholder="All terms"
          value={draft.termId}
          options={termOptions}
          onchange={(value) => set('termId', value)}
        />
      </label>

      <label class="field">
        <span class="field-label">Department <span class="field-optional">Free text</span></span>
        <input
          class="input"
          type="text"
          value={draft.department}
          maxlength="120"
          autocomplete="off"
          oninput={(event) => set('department', event.currentTarget.value)}
        />
      </label>

      <label class="field">
        <span class="field-label">Office <span class="field-optional">Free text</span></span>
        <input
          class="input"
          type="text"
          value={draft.office}
          maxlength="120"
          autocomplete="off"
          oninput={(event) => set('office', event.currentTarget.value)}
        />
      </label>

      <label class="field">
        <span class="field-label">Level</span>
        <EditableSelect
          id="repository-level"
          label="Level"
          placeholder="All levels"
          value={draft.level}
          options={LEVEL_SELECT}
          searchable={false}
          onchange={(value) => set('level', value as Level | '')}
        />
      </label>

      <label class="field">
        <span class="field-label">Status</span>
        <EditableSelect
          id="repository-status"
          label="Status"
          value={draft.status}
          options={STATUS_OPTIONS}
          searchable={false}
          onchange={(value) => set('status', value as RepositoryStatus)}
        />
      </label>

      <label class="field">
        <span class="field-label">PIC name</span>
        <input
          class="input"
          type="text"
          value={draft.pic}
          maxlength="200"
          autocomplete="off"
          oninput={(event) => set('pic', event.currentTarget.value)}
        />
      </label>

      <SearchSdgField
        goals={options(facets?.sdgs)}
        selected={draft.sdgIds}
        onselect={(ids) => set('sdgIds', ids)}
      />

      <SearchDateRange
        legend="Date received"
        name="received"
        from={draft.receivedFrom}
        to={draft.receivedTo}
        error={errors.received}
        onchange={(range) => setRange('received', range)}
      />

      <SearchDateRange
        legend="Activity date"
        name="activity"
        from={draft.activityFrom}
        to={draft.activityTo}
        error={errors.activity}
        onchange={(range) => setRange('activity', range)}
      />
    </div>

    {#if hasErrors(errors)}
      <p class="summary" role="alert">Fix the date range before applying the filters.</p>
    {/if}

    <div class="actions">
      <button class="btn btn-outline" type="submit">Apply</button>
      <button class="btn btn-ghost" type="button" onclick={reset}>
        <RotateCcw size={14} aria-hidden="true" />
        Reset
      </button>
    </div>
  </form>
</div>

<style>
  .panel {
    display: none;
    margin-bottom: 12px;
  }

  .panel.is-open {
    display: block;
  }

  form {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 16px;
  }

  .grid {
    display: grid;
    gap: 12px 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Three columns only when the panel has the width for them (§2). */
  @media (min-width: 1280px) {
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .summary {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 12px 0 0;
  }

  .actions {
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
  }
</style>

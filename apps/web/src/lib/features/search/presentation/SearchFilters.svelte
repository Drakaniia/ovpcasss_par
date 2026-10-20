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

  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
  import {
    CLASSIFICATION_OPTIONS,
    LEVEL_OPTIONS,
  } from '$lib/features/reports/application/wizard-form';

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
</script>

<div class="panel" class:is-open={open} id="repository-filter-panel">
  <form onsubmit={apply} aria-label="Repository filters">
    <div class="grid">
      <label class="field">
        <span class="field-label">Tracking number</span>
        <input
          class="input"
          type="text"
          value={draft.tracking}
          maxlength="40"
          autocomplete="off"
          oninput={(event) => set('tracking', event.currentTarget.value)}
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
        <select
          class="select"
          value={draft.type}
          onchange={(event) => set('type', event.currentTarget.value as ReportType | '')}
        >
          <option value="">All types</option>
          {#each REPORT_TYPES as type (type)}
            <option value={type}>{REPORT_TYPE_LABELS[type]}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span class="field-label">Classification</span>
        <select
          class="select"
          value={draft.classification}
          onchange={(event) =>
            set('classification', event.currentTarget.value as Classification | '')}
        >
          <option value="">All classifications</option>
          {#each CLASSIFICATION_OPTIONS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span class="field-label">Campus</span>
        <select
          class="select"
          value={draft.campusId}
          onchange={(event) => set('campusId', event.currentTarget.value)}
        >
          <option value="">All campuses</option>
          {#each optionsWithCurrent(options(facets?.campuses), draft.campusId) as campus (campus.id)}
            <option value={campus.id}>{campus.label}{campus.isActive ? '' : ' (inactive)'}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span class="field-label">College or unit</span>
        <select
          class="select"
          value={draft.collegeId}
          onchange={(event) => set('collegeId', event.currentTarget.value)}
        >
          <option value="">All colleges and units</option>
          {#each optionsWithCurrent(options(facets?.colleges), draft.collegeId) as college (college.id)}
            <option value={college.id}
              >{college.label}{college.isActive ? '' : ' (inactive)'}</option
            >
          {/each}
        </select>
      </label>

      <label class="field">
        <span class="field-label">Term</span>
        <select
          class="select"
          value={draft.termId}
          onchange={(event) => set('termId', event.currentTarget.value)}
        >
          <option value="">All terms</option>
          {#each optionsWithCurrent(options(facets?.terms), draft.termId) as term (term.id)}
            <option value={term.id}>{term.label}{term.isActive ? '' : ' (inactive)'}</option>
          {/each}
        </select>
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
        <select
          class="select"
          value={draft.level}
          onchange={(event) => set('level', event.currentTarget.value as Level | '')}
        >
          <option value="">All levels</option>
          {#each LEVEL_OPTIONS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span class="field-label">Status</span>
        <select
          class="select"
          value={draft.status}
          onchange={(event) => set('status', event.currentTarget.value as RepositoryStatus)}
        >
          {#each REPOSITORY_STATUSES as status (status)}
            <option value={status}>{statusLabel(status)}</option>
          {/each}
        </select>
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

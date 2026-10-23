<script lang="ts">
  import type { ReportListFacets } from '@par/shared';
  import { Search, X } from '@lucide/svelte';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';

  import { REPORT_TYPE_OPTIONS } from '../application/record-form';
  import type { ReportFilters } from '../application/report-filters';

  /** Every filter lives in the URL, so a shared link reproduces the same register. */
  let {
    filters,
    facets,
    onchange,
    onclear,
  }: {
    filters: ReportFilters;
    facets: ReportListFacets | null;
    onchange: (patch: Partial<ReportFilters>) => void;
    onclear: () => void;
  } = $props();

  const hasFilters = $derived(
    Boolean(
      filters.type ||
      filters.campusId ||
      filters.termId ||
      filters.from ||
      filters.to ||
      filters.q ||
      filters.picName ||
      filters.submittedBy,
    ),
  );
</script>

<div class="filter-bar" role="search" aria-label="Filter reports">
  <label class="search">
    <Search size={15} aria-hidden="true" />
    <span class="visually-hidden">Search reports</span>
    <input
      class="search-input"
      type="search"
      placeholder="Search AR No., title, location, or PIC"
      value={filters.q}
      oninput={(event) => onchange({ q: event.currentTarget.value })}
    />
  </label>

  <label class="filter">
    <span class="filter-label">Personnel in charge</span>
    <input
      class="input name"
      type="text"
      placeholder="Name"
      value={filters.picName}
      oninput={(event) => onchange({ picName: event.currentTarget.value })}
    />
  </label>

  <label class="filter">
    <span class="filter-label">Submitted by</span>
    <input
      class="input name"
      type="text"
      placeholder="Name"
      value={filters.submittedBy}
      oninput={(event) => onchange({ submittedBy: event.currentTarget.value })}
    />
  </label>

  <label class="filter">
    <span class="filter-label">Type</span>
    <EditableSelect
      id="report-filter-type"
      label="Type"
      value={filters.type}
      placeholder="All types"
      searchable={false}
      options={[
        { value: '', label: 'All types' },
        ...REPORT_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
      ]}
      onchange={(value) => onchange({ type: value as ReportFilters['type'] })}
    />
  </label>

  <label class="filter">
    <span class="filter-label">Campus</span>
    <EditableSelect
      id="report-filter-campus"
      label="Campus"
      value={filters.campusId}
      placeholder="All campuses"
      searchable={false}
      options={[
        { value: '', label: 'All campuses' },
        ...(facets?.campuses ?? []).map((campus) => ({
          value: campus.id,
          label: `${campus.label}${campus.isActive ? '' : ' (inactive)'}`,
        })),
      ]}
      onchange={(value) => onchange({ campusId: value })}
    />
  </label>

  <label class="filter">
    <span class="filter-label">Term</span>
    <EditableSelect
      id="report-filter-term"
      label="Term"
      value={filters.termId}
      placeholder="All terms"
      searchable={false}
      options={[
        { value: '', label: 'All terms' },
        ...(facets?.terms ?? []).map((term) => ({
          value: term.id,
          label: `${term.label}${term.isActive ? '' : ' (inactive)'}`,
        })),
      ]}
      onchange={(value) => onchange({ termId: value })}
    />
  </label>

  <label class="filter">
    <span class="filter-label">Archived</span>
    <EditableSelect
      id="report-filter-archived"
      label="Archived"
      value={filters.archived}
      searchable={false}
      options={[
        { value: 'active', label: 'Active only' },
        { value: 'archived', label: 'Archived only' },
        { value: 'all', label: 'Active and archived' },
      ]}
      onchange={(value) => onchange({ archived: value as ReportFilters['archived'] })}
    />
  </label>

  <div class="dates">
    <label class="filter">
      <span class="filter-label">From</span>
      <DatePicker
        id="report-filter-from"
        value={filters.from}
        dense
        onchange={(iso) => onchange({ from: iso })}
      />
    </label>
    <label class="filter">
      <span class="filter-label">To</span>
      <DatePicker
        id="report-filter-to"
        value={filters.to}
        dense
        onchange={(iso) => onchange({ to: iso })}
      />
    </label>
  </div>

  {#if hasFilters}
    <button class="btn btn-ghost btn-sm clear" type="button" onclick={onclear}>
      <X size={14} aria-hidden="true" /> Clear filters
    </button>
  {/if}
</div>

<style>
  .filter-bar {
    align-items: flex-end;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    margin-bottom: 14px;
  }

  .search {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: flex;
    flex: 1 1 260px;
    gap: 8px;
    min-height: 34px;
    padding: 0 10px;
  }

  .search-input {
    background: transparent;
    border: 0;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    min-height: 32px;
    outline: none;
    width: 100%;
  }

  .filter {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .filter-label {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .select,
  .date,
  .name {
    font-size: 13px;
    min-height: 34px;
    min-width: 132px;
    padding: 0 8px;
  }

  .name {
    min-width: 150px;
  }

  .dates {
    display: flex;
    gap: 8px;
  }

  .date {
    min-width: 132px;
  }

  .clear {
    align-items: center;
    display: inline-flex;
    gap: 4px;
    margin-bottom: 1px;
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

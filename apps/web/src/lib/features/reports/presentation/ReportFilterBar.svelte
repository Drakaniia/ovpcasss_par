<script lang="ts">
  import type { ReportListFacets } from '@par/shared';
  import { Search, X } from '@lucide/svelte';

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
      filters.type || filters.campusId || filters.termId || filters.from || filters.to || filters.q,
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
    <span class="filter-label">Type</span>
    <select
      class="select"
      value={filters.type}
      onchange={(event) => onchange({ type: event.currentTarget.value as ReportFilters['type'] })}
    >
      <option value="">All types</option>
      {#each REPORT_TYPE_OPTIONS as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  <label class="filter">
    <span class="filter-label">Campus</span>
    <select
      class="select"
      value={filters.campusId}
      onchange={(event) => onchange({ campusId: event.currentTarget.value })}
    >
      <option value="">All campuses</option>
      {#each facets?.campuses ?? [] as campus (campus.id)}
        <option value={campus.id}>{campus.label}{campus.isActive ? '' : ' (inactive)'}</option>
      {/each}
    </select>
  </label>

  <label class="filter">
    <span class="filter-label">Term</span>
    <select
      class="select"
      value={filters.termId}
      onchange={(event) => onchange({ termId: event.currentTarget.value })}
    >
      <option value="">All terms</option>
      {#each facets?.terms ?? [] as term (term.id)}
        <option value={term.id}>{term.label}{term.isActive ? '' : ' (inactive)'}</option>
      {/each}
    </select>
  </label>

  <div class="dates">
    <label class="filter">
      <span class="filter-label">From</span>
      <input
        class="input date"
        type="date"
        value={filters.from}
        onchange={(event) => onchange({ from: event.currentTarget.value })}
      />
    </label>
    <label class="filter">
      <span class="filter-label">To</span>
      <input
        class="input date"
        type="date"
        value={filters.to}
        onchange={(event) => onchange({ to: event.currentTarget.value })}
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
  .date {
    font-size: 13px;
    min-height: 34px;
    min-width: 132px;
    padding: 0 8px;
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

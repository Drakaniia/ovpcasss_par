<script lang="ts">
  import type { ReportListFacets, ReportType } from '@par/shared';
  import { REPORT_TYPES } from '@par/shared';
  import { Search, X } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import DatePicker from '$lib/components/DatePicker.svelte';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

  import {
    activeFilterCount,
    type ReportFilterChip,
    type ReportFilters,
  } from '../application/report-list';

  let {
    filters,
    facets,
    chips,
    onchange,
    onremove,
    onclear,
  }: {
    filters: ReportFilters;
    facets: ReportListFacets | null;
    chips: ReportFilterChip[];
    onchange: (patch: Partial<ReportFilters>) => void;
    onremove: (id: ReportFilterChip['id']) => void;
    onclear: () => void;
  } = $props();

  let query = $state(untrack(() => filters.q));
  let panelOpen = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const filterCount = $derived(activeFilterCount(filters));

  // URL changes (Clear all, Back) win; typing does not echo back through the URL.
  $effect(() => {
    const next = filters.q;
    if (untrack(() => query) !== next) query = next;
  });

  $effect(() => () => clearTimeout(timer));

  function queueQuery(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    clearTimeout(timer);
    timer = setTimeout(() => onchange({ q: value.trim() }), 250);
  }
</script>

<div class="filter-bar" role="search" aria-label="Filter reports">
  <div class="search-row">
    <div class="search-field">
      <span class="search-icon" aria-hidden="true">
        <Search size={16} />
      </span>
      <input
        class="input"
        type="search"
        value={query}
        placeholder="Search title or tracking number"
        aria-label="Search title or tracking number"
        autocomplete="off"
        data-search-field
        oninput={queueQuery}
      />
    </div>

    <button
      class="btn btn-outline filters-toggle"
      type="button"
      aria-expanded={panelOpen}
      aria-controls="report-filter-panel"
      onclick={() => (panelOpen = !panelOpen)}
    >
      Filters ({filterCount})
    </button>
  </div>

  <div class="panel" class:is-open={panelOpen} id="report-filter-panel">
    <select
      class="select filter-select"
      aria-label="Filter by type"
      value={filters.type}
      onchange={(event) => onchange({ type: event.currentTarget.value as ReportType | '' })}
    >
      <option value="">All types</option>
      {#each REPORT_TYPES as type (type)}
        <option value={type}>{REPORT_TYPE_LABELS[type]}</option>
      {/each}
    </select>

    <select
      class="select filter-select"
      aria-label="Filter by campus"
      value={filters.campusId}
      onchange={(event) => onchange({ campusId: event.currentTarget.value })}
    >
      <option value="">All campuses</option>
      {#each facets?.campuses ?? [] as campus (campus.id)}
        <option value={campus.id}>
          {campus.label}{campus.isActive ? '' : ' (inactive)'}
        </option>
      {/each}
    </select>

    <select
      class="select filter-select"
      aria-label="Filter by term"
      value={filters.termId}
      onchange={(event) => onchange({ termId: event.currentTarget.value })}
    >
      <option value="">All terms</option>
      {#each facets?.terms ?? [] as term (term.id)}
        <option value={term.id}>
          {term.label}{term.isActive ? '' : ' (inactive)'}
        </option>
      {/each}
    </select>

    <div class="date-range" role="group" aria-label="Activity date range">
      <div class="date-field">
        <label class="date-label" for="filter-from">From</label>
        <DatePicker
          id="filter-from"
          label="Activity date from"
          value={filters.from}
          onchange={(iso) => onchange({ from: iso })}
        />
      </div>
      <div class="date-field">
        <label class="date-label" for="filter-to">To</label>
        <DatePicker
          id="filter-to"
          label="Activity date to"
          value={filters.to}
          onchange={(iso) => onchange({ to: iso })}
        />
      </div>
    </div>
  </div>

  {#if chips.length > 0}
    <div class="chips" aria-label="Active filters">
      {#each chips as chip (chip.id)}
        <button
          class="chip"
          class:is-inactive={chip.inactive}
          type="button"
          aria-label="Remove filter: {chip.label}"
          title={chip.title}
          onclick={() => onremove(chip.id)}
        >
          <span>{chip.label}</span>
          {#if chip.inactive}<span class="chip-flag">Inactive</span>{/if}
          <X size={12} aria-hidden="true" />
        </button>
      {/each}

      <button class="clear-all" type="button" onclick={onclear}>Clear all</button>
    </div>
  {/if}
</div>

<style>
  .filter-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .search-row {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .search-field {
    position: relative;
    width: 300px;
  }

  .search-icon {
    color: var(--text-secondary);
    display: inline-flex;
    left: 10px;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .search-field .input {
    padding-left: 32px;
  }

  .panel {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .filter-select {
    width: 176px;
  }

  .date-range {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .date-field {
    align-items: center;
    display: inline-flex;
    gap: 6px;
    width: 220px;
  }

  .date-label {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
  }

  .chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    align-items: center;
    background: var(--primary-subtle);
    border: 1px solid transparent;
    border-radius: var(--radius-badge);
    color: var(--text-primary);
    display: inline-flex;
    font-size: 12px;
    gap: 6px;
    min-height: 26px;
    padding: 0 8px;
  }

  .chip:hover {
    border-color: var(--primary);
  }

  .chip.is-inactive {
    background: var(--status-neutral-bg);
    color: var(--text-secondary);
  }

  .chip-flag {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .clear-all {
    background: transparent;
    border: 0;
    color: var(--link);
    font-size: 12px;
    min-height: 26px;
    padding: 0 4px;
  }

  .clear-all:hover {
    text-decoration: underline;
  }

  .filters-toggle {
    display: none;
  }

  /* Below 1280 px only Search stays visible; the rest moves into the panel. */
  @media (max-width: 1279px) {
    .search-field {
      flex: 1;
      width: auto;
    }

    .filters-toggle {
      display: inline-flex;
    }

    .panel {
      display: none;
    }

    .panel.is-open {
      display: grid;
      gap: 8px;
      grid-template-columns: 1fr 1fr;
    }

    .filter-select {
      width: 100%;
    }

    .date-range {
      grid-column: 1 / -1;
    }

    .date-field {
      width: 100%;
    }
  }
</style>

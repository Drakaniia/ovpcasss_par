<script lang="ts">
  import type { ReportType, RepositoryFacets, RepositoryStatus } from '@par/shared';
  import { REPOSITORY_STATUSES, REPORT_TYPES } from '@par/shared';
  import { Search, X } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

  import {
    statusLabel,
    type RepositoryChip,
    type RepositoryChipId,
  } from '../application/repository-chips';
  import type { RepositoryFilters } from '../application/repository-filters';
  import { optionsWithCurrent } from '../application/repository-rows';

  /**
   * The repository's search row (UI spec §7.11): the free-text field, the
   * Filters (n) toggle, the three most-used filters as always-visible controls,
   * and every other active filter as a removable chip with one Clear.
   */
  let {
    filters,
    facets,
    chips,
    filterCount,
    panelOpen,
    onquery,
    onchange,
    onremove,
    onclear,
    ontogglepanel,
  }: {
    filters: RepositoryFilters;
    facets: RepositoryFacets | null;
    chips: RepositoryChip[];
    filterCount: number;
    panelOpen: boolean;
    onquery: (q: string) => void;
    onchange: (patch: Partial<RepositoryFilters>) => void;
    onremove: (id: RepositoryChipId) => void;
    onclear: () => void;
    ontogglepanel: () => void;
  } = $props();

  const TYPE_OPTIONS = [
    { value: '', label: 'All types' },
    ...REPORT_TYPES.map((type) => ({ value: type, label: REPORT_TYPE_LABELS[type] })),
  ];

  const STATUS_OPTIONS = REPOSITORY_STATUSES.map((status) => ({
    value: status,
    label: statusLabel(status),
  }));

  const termOptions = $derived([
    { value: '', label: 'All terms' },
    ...optionsWithCurrent(facets?.terms ?? [], filters.termId).map((term) => ({
      value: term.id,
      label: term.isActive ? term.label : `${term.label} (inactive)`,
    })),
  ]);

  let query = $state(untrack(() => filters.q));
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearable = $derived(filterCount > 0 || filters.q !== '');

  // URL changes (Clear, Back) win; typing does not echo back through the URL.
  $effect(() => {
    const next = filters.q;
    if (untrack(() => query) !== next) query = next;
  });

  $effect(() => () => clearTimeout(timer));

  function queueQuery(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    clearTimeout(timer);
    timer = setTimeout(() => onquery(value.trim()), 250);
  }
</script>

<div class="toolbar" role="search" aria-label="Search the repository">
  <div class="search-row">
    <div class="search-field">
      <span class="search-icon" aria-hidden="true">
        <Search size={16} />
      </span>
      <input
        class="input"
        type="search"
        value={query}
        placeholder="Search title, narrative, PIC, location…"
        aria-label="Search title, narrative, PIC, and location"
        autocomplete="off"
        data-search-field
        oninput={queueQuery}
      />
    </div>

    <button
      class="btn btn-outline"
      type="button"
      aria-expanded={panelOpen}
      aria-controls="repository-filter-panel"
      onclick={ontogglepanel}
    >
      Filters ({filterCount})
    </button>
  </div>

  <div class="filter-row">
    <div class="quick">
      <EditableSelect
        id="search-toolbar-type"
        label="Type"
        placeholder="All types"
        value={filters.type}
        options={TYPE_OPTIONS}
        searchable={false}
        onchange={(value) => onchange({ type: value as ReportType | '' })}
      />
    </div>

    <div class="quick">
      <EditableSelect
        id="search-toolbar-term"
        label="Term"
        placeholder="All terms"
        value={filters.termId}
        options={termOptions}
        onchange={(value) => onchange({ termId: value })}
      />
    </div>

    <div class="quick">
      <EditableSelect
        id="search-toolbar-status"
        label="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        searchable={false}
        onchange={(value) => onchange({ status: value as RepositoryStatus })}
      />
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
      </div>
    {/if}

    {#if clearable}
      <button
        class="clear"
        type="button"
        title="Clear the search and all filters"
        onclick={onclear}
      >
        Clear
      </button>
    {/if}
  </div>
</div>

<style>
  .toolbar {
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
    max-width: 720px;
    position: relative;
    width: 100%;
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

  .filter-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .quick {
    width: 176px;
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

  .clear {
    background: transparent;
    border: 0;
    color: var(--link);
    font-size: 12px;
    min-height: 26px;
    padding: 0 4px;
  }

  .clear:hover {
    text-decoration: underline;
  }
</style>

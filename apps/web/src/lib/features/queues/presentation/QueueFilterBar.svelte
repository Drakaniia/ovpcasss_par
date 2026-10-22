<script lang="ts">
  import type { QueueFacets, QueueSort, ReportType } from '@par/shared';
  import { QUEUE_SORTS, REPORT_TYPES } from '@par/shared';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

  import { QUEUE_SORT_LABELS, type QueueFilters } from '../application/queue-filters';

  /** Type, campus, college, and sort; every one of them is URL state (§7.9). */
  let {
    filters,
    facets,
    onchange,
  }: {
    filters: QueueFilters;
    facets: QueueFacets | null;
    onchange: (patch: Partial<QueueFilters>) => void;
  } = $props();

  const TYPE_OPTIONS = [
    { value: '', label: 'All types' },
    ...REPORT_TYPES.map((type) => ({ value: type, label: REPORT_TYPE_LABELS[type] })),
  ];

  const SORT_OPTIONS = QUEUE_SORTS.map((sort) => ({
    value: sort,
    label: QUEUE_SORT_LABELS[sort],
  }));

  const campusOptions = $derived([
    { value: '', label: 'All campuses' },
    ...(facets?.campuses ?? []).map((campus) => ({
      value: campus.id,
      label: campus.isActive ? campus.label : `${campus.label} (inactive)`,
    })),
  ]);

  const collegeOptions = $derived([
    { value: '', label: 'All colleges' },
    ...(facets?.colleges ?? []).map((college) => ({
      value: college.id,
      label: college.isActive ? college.label : `${college.label} (inactive)`,
    })),
  ]);
</script>

<div class="filter-bar" role="search" aria-label="Filter the queue">
  <div class="filter-select">
    <EditableSelect
      id="queue-type"
      label="Type"
      placeholder="All types"
      value={filters.type}
      options={TYPE_OPTIONS}
      searchable={false}
      onchange={(value) => onchange({ type: value as ReportType | '' })}
    />
  </div>

  <div class="filter-select">
    <EditableSelect
      id="queue-campus"
      label="Campus"
      placeholder="All campuses"
      value={filters.campusId}
      options={campusOptions}
      onchange={(value) => onchange({ campusId: value })}
    />
  </div>

  <div class="filter-select">
    <EditableSelect
      id="queue-college"
      label="College"
      placeholder="All colleges"
      value={filters.collegeId}
      options={collegeOptions}
      onchange={(value) => onchange({ collegeId: value })}
    />
  </div>

  <div class="sort">
    <span class="sort-label">Sort</span>
    <div class="filter-select">
      <EditableSelect
        id="queue-sort"
        label="Sort the queue"
        value={filters.sort}
        options={SORT_OPTIONS}
        searchable={false}
        onchange={(value) => onchange({ sort: value as QueueSort })}
      />
    </div>
  </div>
</div>

<style>
  .filter-bar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .filter-select {
    width: 190px;
  }

  .sort {
    align-items: center;
    display: inline-flex;
    gap: 8px;
  }

  .sort-label {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
  }
</style>

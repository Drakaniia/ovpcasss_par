<script lang="ts">
  import type { QueueFacets, QueueSort, ReportType } from '@par/shared';
  import { QUEUE_SORTS, REPORT_TYPES } from '@par/shared';

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
</script>

<div class="filter-bar" role="search" aria-label="Filter the queue">
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
    aria-label="Filter by college"
    value={filters.collegeId}
    onchange={(event) => onchange({ collegeId: event.currentTarget.value })}
  >
    <option value="">All colleges</option>
    {#each facets?.colleges ?? [] as college (college.id)}
      <option value={college.id}>
        {college.label}{college.isActive ? '' : ' (inactive)'}
      </option>
    {/each}
  </select>

  <label class="sort">
    <span class="sort-label">Sort</span>
    <select
      class="select filter-select"
      aria-label="Sort the queue"
      value={filters.sort}
      onchange={(event) => onchange({ sort: event.currentTarget.value as QueueSort })}
    >
      {#each QUEUE_SORTS as sort (sort)}
        <option value={sort}>{QUEUE_SORT_LABELS[sort]}</option>
      {/each}
    </select>
  </label>
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

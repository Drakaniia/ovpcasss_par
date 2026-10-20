<script lang="ts">
  import type { ReportFilterOption, ReportType, RepositoryFacets } from '@par/shared';
  import { REPORT_TYPES } from '@par/shared';

  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

  import type { RepositoryFilters } from '../application/repository-filters';
  import { optionsWithCurrent } from '../application/repository-rows';

  /**
   * When a search matched nothing (UI spec §7.11). The three most-used filters
   * are offered as working controls — choosing a value applies that filter and
   * runs the search again; they never merely describe what to try.
   */
  let {
    filters,
    facets,
    onapply,
  }: {
    filters: RepositoryFilters;
    facets: RepositoryFacets | null;
    onapply: (patch: Partial<RepositoryFilters>) => void;
  } = $props();

  const options = (entries: readonly ReportFilterOption[] | undefined) => entries ?? [];
</script>

<div class="suggestions" role="group" aria-label="Suggested filters">
  <p class="lead">Most-used filters</p>

  <div class="controls">
    <label class="suggestion">
      <span>Type</span>
      <select
        class="select"
        value={filters.type}
        onchange={(event) => onapply({ type: event.currentTarget.value as ReportType | '' })}
      >
        <option value="">All types</option>
        {#each REPORT_TYPES as type (type)}
          <option value={type}>{REPORT_TYPE_LABELS[type]}</option>
        {/each}
      </select>
    </label>

    <label class="suggestion">
      <span>Term</span>
      <select
        class="select"
        value={filters.termId}
        onchange={(event) => onapply({ termId: event.currentTarget.value })}
      >
        <option value="">All terms</option>
        {#each optionsWithCurrent(options(facets?.terms), filters.termId) as term (term.id)}
          <option value={term.id}>{term.label}{term.isActive ? '' : ' (inactive)'}</option>
        {/each}
      </select>
    </label>

    <label class="suggestion">
      <span>College</span>
      <select
        class="select"
        value={filters.collegeId}
        onchange={(event) => onapply({ collegeId: event.currentTarget.value })}
      >
        <option value="">All colleges and units</option>
        {#each optionsWithCurrent(options(facets?.colleges), filters.collegeId) as college (college.id)}
          <option value={college.id}>{college.label}{college.isActive ? '' : ' (inactive)'}</option>
        {/each}
      </select>
    </label>
  </div>
</div>

<style>
  .suggestions {
    border-top: 1px solid var(--border);
    margin-top: 8px;
    padding-top: 16px;
  }

  .lead {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    margin: 0 0 8px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .suggestion {
    display: flex;
    flex-direction: column;
    font-size: 12px;
    gap: 4px;
    width: 220px;
  }

  .suggestion span {
    color: var(--text-secondary);
    font-weight: 500;
  }
</style>

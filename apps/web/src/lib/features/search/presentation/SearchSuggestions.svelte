<script lang="ts">
  import type { ReportFilterOption, ReportType, RepositoryFacets } from '@par/shared';
  import { REPORT_TYPES } from '@par/shared';

  import EditableSelect from '$lib/components/EditableSelect.svelte';
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

  const TYPE_OPTIONS = [
    { value: '', label: 'All types' },
    ...REPORT_TYPES.map((type) => ({ value: type, label: REPORT_TYPE_LABELS[type] })),
  ];

  const termOptions = $derived(facetOptions(facets?.terms, filters.termId, 'All terms'));
  const collegeOptions = $derived(
    facetOptions(facets?.colleges, filters.collegeId, 'All colleges and units'),
  );

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
</script>

<div class="suggestions" role="group" aria-label="Suggested filters">
  <p class="lead">Most-used filters</p>

  <div class="controls">
    <div class="suggestion">
      <span>Type</span>
      <EditableSelect
        id="search-suggestion-type"
        label="Type"
        placeholder="All types"
        value={filters.type}
        options={TYPE_OPTIONS}
        searchable={false}
        onchange={(value) => onapply({ type: value as ReportType | '' })}
      />
    </div>

    <div class="suggestion">
      <span>Term</span>
      <EditableSelect
        id="search-suggestion-term"
        label="Term"
        placeholder="All terms"
        value={filters.termId}
        options={termOptions}
        onchange={(value) => onapply({ termId: value })}
      />
    </div>

    <div class="suggestion">
      <span>College</span>
      <EditableSelect
        id="search-suggestion-college"
        label="College or unit"
        placeholder="All colleges and units"
        value={filters.collegeId}
        options={collegeOptions}
        onchange={(value) => onapply({ collegeId: value })}
      />
    </div>
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

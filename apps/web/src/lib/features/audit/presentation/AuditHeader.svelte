<script lang="ts">
  import { Filter } from '@lucide/svelte';

  let {
    filterCount,
    mobileFilterOpen,
    ontogglefilters,
  }: {
    filterCount: number;
    mobileFilterOpen: boolean;
    ontogglefilters: () => void;
  } = $props();
</script>

<header class="audit-header">
  <div class="header-content">
    <h1 class="page-title">Audit log</h1>
    <p class="caveat-line">Append-only record. Times are Asia/Manila.</p>
  </div>

  <button
    class="filter-toggle-btn btn btn-outline"
    type="button"
    aria-expanded={mobileFilterOpen}
    onclick={ontogglefilters}
  >
    <Filter size={16} aria-hidden="true" />
    <span>Filters {filterCount > 0 ? `(${filterCount})` : ''}</span>
  </button>
</header>

<style>
  .audit-header {
    align-items: flex-start;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .page-title {
    color: var(--text-primary);
    font-size: 24px;
    font-weight: 700;
    margin: 0;
  }

  .caveat-line {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .filter-toggle-btn {
    align-items: center;
    display: none;
    gap: 6px;
  }

  @media (max-width: 1279px) {
    .filter-toggle-btn {
      display: inline-flex;
    }
  }
</style>

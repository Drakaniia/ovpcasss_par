<script lang="ts">
  import type { ReportFilterOption } from '@par/shared';
  import { Search } from '@lucide/svelte';

  /**
   * The SDG multi-select (UI spec §7.11): goals 1–17 from the reference data,
   * searchable by number or title. Selected goals are counted on the legend so
   * the field reads even while the list is scrolled.
   */
  let {
    goals,
    selected,
    onselect,
  }: {
    goals: readonly ReportFilterOption[];
    selected: readonly string[];
    onselect: (ids: string[]) => void;
  } = $props();

  let query = $state('');

  const visible = $derived(
    query.trim()
      ? goals.filter((goal) => goal.label.toLowerCase().includes(query.trim().toLowerCase()))
      : goals,
  );
  const summary = $derived(selected.length === 0 ? 'None selected' : `${selected.length} selected`);

  function toggle(id: string) {
    onselect(selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id]);
  }
</script>

<fieldset class="field sdg-field">
  <legend class="field-label">
    SDG <span class="sr-only">(Sustainable Development Goals 1 to 17)</span>
    <span class="field-optional">{summary}</span>
  </legend>

  <div class="search">
    <span class="search-icon" aria-hidden="true"><Search size={14} /></span>
    <input
      class="input"
      type="search"
      value={query}
      placeholder="Search 1–17"
      aria-label="Search the Sustainable Development Goals"
      autocomplete="off"
      oninput={(event) => (query = event.currentTarget.value)}
    />
  </div>

  <div class="list">
    {#if visible.length === 0}
      <p class="empty">
        {goals.length === 0 ? 'No goals are available.' : 'No goal matches that search.'}
      </p>
    {:else}
      {#each visible as goal (goal.id)}
        <label class="option">
          <input
            type="checkbox"
            checked={selected.includes(goal.id)}
            onchange={() => toggle(goal.id)}
          />
          <span>{goal.label}</span>
        </label>
      {/each}
    {/if}
  </div>
</fieldset>

<style>
  .sdg-field {
    border: 0;
    margin: 0;
    min-width: 0;
    padding: 0;
  }

  .search {
    position: relative;
  }

  .search-icon {
    color: var(--text-secondary);
    display: inline-flex;
    left: 8px;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .search .input {
    padding-left: 28px;
  }

  .list {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 132px;
    overflow-y: auto;
    padding: 6px 8px;
  }

  .option {
    align-items: flex-start;
    display: flex;
    font-size: 12px;
    gap: 8px;
    line-height: 1.35;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 4px 0;
  }
</style>

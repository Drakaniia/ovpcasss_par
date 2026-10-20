<script lang="ts">
  import { Check, Search, X } from '@lucide/svelte';
  import type { Sdg } from '@par/shared';

  import WizardField from './WizardField.svelte';

  /**
   * SDG multi-select (UI phase 06 §3): numbered chips, search by number or title,
   * at least one required. Options come from reference data; none are hardcoded.
   */
  let {
    id,
    selected,
    options,
    error,
    flagged = false,
    disabled = false,
    onchange,
  }: {
    id: string;
    selected: string[];
    options: readonly Sdg[];
    error?: string;
    flagged?: boolean;
    disabled?: boolean;
    onchange: (ids: string[]) => void;
  } = $props();

  let query = $state('');

  const chosen = $derived(
    selected
      .map((sdgId) => options.find((option) => option.id === sdgId))
      .filter((option): option is Sdg => Boolean(option)),
  );

  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        String(option.number).includes(needle) || option.title.toLowerCase().includes(needle),
    );
  });

  function toggle(sdg: Sdg): void {
    if (disabled) return;
    onchange(
      selected.includes(sdg.id) ? selected.filter((id) => id !== sdg.id) : [...selected, sdg.id],
    );
  }

  function remove(sdgId: string): void {
    if (disabled) return;
    onchange(selected.filter((id) => id !== sdgId));
  }
</script>

<WizardField {id} label="SDGs" {error} {flagged} required hint="Search by number or title.">
  {#snippet children({ describedBy, invalid })}
    <div class="sdg-picker" class:has-error={invalid}>
      {#if chosen.length > 0}
        <ul class="chips" aria-label="Selected SDGs">
          {#each chosen as sdg (sdg.id)}
            <li class="chip">
              <span>{sdg.number} {sdg.title}</span>
              <button
                type="button"
                aria-label="Remove SDG {sdg.number} {sdg.title}"
                {disabled}
                onclick={() => remove(sdg.id)}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="search-row">
        <Search size={14} aria-hidden="true" />
        <input
          {id}
          class="sdg-search"
          type="search"
          placeholder="Search SDGs"
          aria-label="Search SDGs"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          {disabled}
          bind:value={query}
        />
      </div>

      {#if options.length === 0}
        <p class="empty-note">
          No SDGs are available in the reference data. Contact the OVPCASSS administrator.
        </p>
      {:else if filtered.length === 0}
        <p class="empty-note">No SDGs match this search.</p>
      {:else}
        <ul class="options" aria-label="Available SDGs">
          {#each filtered as sdg (sdg.id)}
            <li>
              <button
                class="option"
                class:is-selected={selected.includes(sdg.id)}
                type="button"
                aria-pressed={selected.includes(sdg.id)}
                {disabled}
                onclick={() => toggle(sdg)}
              >
                <span class="number">{sdg.number}</span>
                <span class="title">{sdg.title}</span>
                {#if selected.includes(sdg.id)}
                  <span class="check" aria-hidden="true"><Check size={14} /></span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/snippet}
</WizardField>

<style>
  .sdg-picker {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 8px;
  }

  .sdg-picker.has-error {
    border-color: var(--status-danger-fg);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
  }

  .chip {
    align-items: center;
    background: var(--primary-subtle);
    border-radius: var(--radius-badge);
    color: var(--text-primary);
    display: inline-flex;
    font-size: 12px;
    gap: 6px;
    padding: 4px 6px 4px 8px;
  }

  .chip button {
    align-items: center;
    background: transparent;
    border-radius: 2px;
    color: var(--text-secondary);
    display: inline-flex;
    height: 18px;
    justify-content: center;
    width: 18px;
  }

  .chip button:hover {
    color: var(--text-primary);
  }

  .search-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    display: flex;
    gap: 6px;
    padding: 0 2px 6px;
  }

  .sdg-search {
    background: transparent;
    border: 0;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    min-height: 24px;
    outline: none;
    padding: 0;
    width: 100%;
  }

  .options {
    list-style: none;
    margin: 0;
    max-height: 220px;
    overflow-y: auto;
    padding: 4px 0 0;
  }

  .option {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: flex;
    font-size: 13px;
    gap: 10px;
    min-height: 32px;
    padding: 4px 6px;
    text-align: left;
    width: 100%;
  }

  .option:hover {
    background: var(--surface-page);
  }

  .option.is-selected {
    background: var(--primary-subtle);
  }

  .number {
    background: var(--surface-page);
    border-radius: var(--radius-badge);
    color: var(--text-secondary);
    flex: none;
    font-family: var(--font-mono);
    font-size: 11px;
    min-width: 24px;
    padding: 2px 4px;
    text-align: center;
  }

  .title {
    flex: 1;
    min-width: 0;
  }

  .check {
    color: var(--primary);
    flex: none;
  }

  .empty-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 8px 4px 4px;
  }
</style>

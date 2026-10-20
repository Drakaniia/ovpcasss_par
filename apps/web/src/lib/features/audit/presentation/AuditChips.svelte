<script lang="ts">
  import { X } from '@lucide/svelte';

  import {
    activeAuditChips,
    type AuditChip,
    type AuditFilters,
  } from '../application/audit-filters';

  let {
    filters,
    total,
    onremove,
    onclearall,
  }: {
    filters: AuditFilters;
    total: number;
    onremove: (field: AuditChip['field']) => void;
    onclearall: () => void;
  } = $props();

  const chips = $derived(activeAuditChips(filters));
</script>

{#if chips.length > 0}
  <div class="audit-chips-bar" aria-label="Active filters">
    <div class="chips-list">
      <span class="active-count">Filters ({chips.length}):</span>
      <span class="sr-only"
        >{total} {total === 1 ? 'event matches' : 'events match'} these filters.</span
      >
      {#each chips as chip (chip.id)}
        <span class="audit-chip">
          <span class="chip-label">{chip.label}:</span>
          <span class="chip-value">{chip.value}</span>
          <button
            class="chip-remove"
            type="button"
            aria-label="Remove filter {chip.label}"
            onclick={() => onremove(chip.field)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      {/each}
      <button class="clear-all-btn" type="button" onclick={onclearall}> Reset filters </button>
    </div>
  </div>
{/if}

<style>
  .audit-chips-bar {
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .chips-list {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .active-count {
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
  }

  .audit-chip {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 9999px;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    padding: 3px 10px 3px 12px;
  }

  .chip-label {
    color: var(--text-secondary);
  }

  .chip-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .chip-remove {
    align-items: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    height: 18px;
    justify-content: center;
    margin: 0 -2px 0 2px;
    padding: 0;
    width: 18px;
  }

  .chip-remove:hover {
    background: var(--row-hover);
    color: var(--text-primary);
  }

  .chip-remove:focus-visible {
    outline: 2px solid var(--focus-ring);
  }

  .clear-all-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
    text-decoration: underline;
  }

  .clear-all-btn:hover {
    color: var(--text-primary);
  }

  .clear-all-btn:focus-visible {
    outline: 2px solid var(--focus-ring);
  }
</style>

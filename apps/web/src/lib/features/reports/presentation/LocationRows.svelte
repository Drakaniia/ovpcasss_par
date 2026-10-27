<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';

  import LocationField from './LocationField.svelte';

  /**
   * Venue rows (todo: multiple location input). An activity can happen at more
   * than one place, so the Location field is a list of the same combobox. The
   * first row is the field the visible label points at; the button adds another,
   * and a row can be removed while at least one stays.
   */
  let {
    id,
    label,
    locations,
    invalid = false,
    describedBy,
    disabled = false,
    onchange,
    onadd,
    onremove,
  }: {
    id: string;
    label: string;
    locations: readonly string[];
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
    onchange: (index: number, value: string) => void;
    onadd: () => void;
    onremove: (index: number) => void;
  } = $props();

  function fieldId(index: number): string {
    return index === 0 ? id : `${id}-${index + 1}`;
  }
</script>

<div class="location-rows">
  {#each locations as location, index (index)}
    <div class="location-row">
      <LocationField
        id={fieldId(index)}
        label="{label} {index + 1}"
        value={location}
        {invalid}
        {describedBy}
        {disabled}
        onchange={(value) => onchange(index, value)}
      />

      {#if locations.length > 1}
        <button
          class="icon-action remove"
          type="button"
          {disabled}
          aria-label="Remove {label.toLowerCase()} {index + 1}"
          onclick={() => onremove(index)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      {/if}
    </div>
  {/each}

  <button class="btn btn-outline btn-sm add" type="button" {disabled} onclick={onadd}>
    <Plus size={15} aria-hidden="true" /> Add location
  </button>
</div>

<style>
  .location-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .location-row {
    align-items: start;
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
  }

  .icon-action {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 36px;
    justify-content: center;
    width: 32px;
  }

  .icon-action:hover:not(:disabled) {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .add {
    align-self: flex-start;
    display: inline-flex;
    gap: 6px;
  }
</style>

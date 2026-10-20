<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

  import DatePicker from '$lib/components/DatePicker.svelte';

  /**
   * One date range from the filter panel (UI spec §7.11): the legend names the
   * range, both ends are labelled, and an inverted pair reports an inline error
   * with an icon, never colour alone (§8.4).
   */
  let {
    legend,
    name,
    from,
    to,
    error,
    onchange,
  }: {
    legend: string;
    /** Distinguishes the two ranges in their error ids and labels. */
    name: string;
    from: string;
    to: string;
    error?: string;
    onchange: (range: { from: string; to: string }) => void;
  } = $props();

  const errorId = $derived(`${name}-error`);
  const fromId = $derived(`${name}-from`);
  const toId = $derived(`${name}-to`);
</script>

<fieldset class="field range-field" aria-describedby={error ? errorId : undefined}>
  <legend class="field-label">{legend}</legend>

  <div class="dates">
    <div class="date">
      <label for={fromId}>From</label>
      <DatePicker
        id={fromId}
        label="{legend} from"
        value={from}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
        onchange={(iso) => onchange({ from: iso, to })}
      />
    </div>

    <div class="date">
      <label for={toId}>To</label>
      <DatePicker
        id={toId}
        label="{legend} to"
        value={to}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
        onchange={(iso) => onchange({ from, to: iso })}
      />
    </div>
  </div>

  {#if error}
    <p class="field-error" id={errorId}>
      <AlertCircle size={16} aria-hidden="true" />
      <span>{error}</span>
    </p>
  {/if}
</fieldset>

<style>
  .range-field {
    border: 0;
    margin: 0;
    min-width: 0;
    padding: 0;
  }

  .dates {
    display: flex;
    gap: 8px;
  }

  .date {
    display: flex;
    flex: 1;
    flex-direction: column;
    font-size: 12px;
    gap: 2px;
  }

  .date label {
    color: var(--text-secondary);
  }
</style>

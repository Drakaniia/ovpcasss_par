<script lang="ts">
  import { untrack } from 'svelte';

  import { isCustomValue, OTHER_OPTION_VALUE, type WizardOption } from '../application/wizard-form';
  import WizardField from './WizardField.svelte';

  /**
   * Department and Office are admin-seeded selects with an "Other (specify)"
   * option (UI phase 06 §3, project spec §14 Q5 still open). The form holds the
   * final string, so a custom value survives a save and restore.
   */
  let {
    id,
    label,
    value,
    options,
    error,
    optional = false,
    flagged = false,
    disabled = false,
    onchange,
  }: {
    id: string;
    label: string;
    value: string;
    options: readonly WizardOption[];
    error?: string;
    optional?: boolean;
    flagged?: boolean;
    disabled?: boolean;
    onchange: (value: string) => void;
  } = $props();

  let custom = $state(untrack(() => isCustomValue(value, options)));

  function select(event: Event): void {
    const next = (event.currentTarget as HTMLSelectElement).value;
    if (next === OTHER_OPTION_VALUE) {
      custom = true;
      onchange('');
      return;
    }
    custom = false;
    onchange(next);
  }
</script>

<WizardField {id} {label} {error} {optional} {flagged}>
  {#snippet children({ describedBy, invalid })}
    <select
      {id}
      class="select"
      value={custom ? OTHER_OPTION_VALUE : value}
      {disabled}
      aria-invalid={invalid ? 'true' : undefined}
      aria-describedby={describedBy}
      onchange={select}
    >
      <option value="">Select…</option>
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
      <option value={OTHER_OPTION_VALUE}>Other (specify)</option>
    </select>

    {#if custom}
      <input
        id="{id}-other"
        class="input other-input"
        type="text"
        value={value}
        {disabled}
        aria-label="{label}, other (specify)"
        maxlength="120"
        oninput={(event) => onchange(event.currentTarget.value)}
      />
    {/if}
  {/snippet}
</WizardField>

<style>
  .other-input {
    margin-top: 6px;
  }
</style>

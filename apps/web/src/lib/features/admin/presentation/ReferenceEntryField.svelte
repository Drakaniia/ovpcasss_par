<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

  import DatePicker from '$lib/components/DatePicker.svelte';

  import type {
    ReferenceField,
    ReferenceFieldOption,
    ReferenceFieldValue,
  } from '../application/reference-types';

  let {
    field,
    value,
    id,
    error,
    disabled = false,
    hint,
    options = [],
    onchange,
    onblur,
  }: {
    field: ReferenceField;
    value: ReferenceFieldValue | undefined;
    id: string;
    error?: string;
    disabled?: boolean;
    hint?: string;
    options?: readonly ReferenceFieldOption[];
    onchange: (value: ReferenceFieldValue) => void;
    onblur?: () => void;
  } = $props();

  const hintText = $derived(hint ?? field.hint);
  const describedBy = $derived(error ? `${id}-error` : hintText ? `${id}-hint` : undefined);
</script>

{#if field.kind === 'toggle'}
  <div class="toggle-row">
    <label class="toggle-label" for={id}>
      <input
        {id}
        type="checkbox"
        checked={Boolean(value)}
        {disabled}
        aria-describedby={describedBy}
        onchange={(event) => onchange(event.currentTarget.checked)}
      />
      <span>{field.label}</span>
    </label>
    {#if error}
      <p class="field-error" id="{id}-error">
        <AlertCircle size={16} aria-hidden="true" />
        {error}
      </p>
    {/if}
  </div>
{:else}
  <div class="field">
    <label class="field-label" for={id}>{field.label}</label>

    {#if field.kind === 'select'}
      <select
        {id}
        class="select"
        value={String(value ?? '')}
        {disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        onchange={(event) => onchange(event.currentTarget.value)}
        {onblur}
      >
        <option value="">Select…</option>
        {#each options as option (String(option.value))}
          <option value={String(option.value)}>{option.label}</option>
        {/each}
      </select>
    {:else if field.kind === 'date'}
      <DatePicker
        {id}
        label={field.label}
        value={String(value ?? '')}
        {disabled}
        invalid={Boolean(error)}
        {describedBy}
        onchange={(iso) => onchange(iso)}
        {onblur}
      />
    {:else if field.kind === 'number'}
      <input
        {id}
        class="input"
        type="number"
        inputmode="numeric"
        min={field.min}
        max={field.max}
        value={String(value ?? '')}
        {disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        oninput={(event) => onchange(event.currentTarget.value)}
        {onblur}
      />
    {:else}
      <input
        {id}
        class="input"
        type="text"
        value={String(value ?? '')}
        {disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        oninput={(event) => {
          const next = field.uppercase
            ? event.currentTarget.value.toUpperCase()
            : event.currentTarget.value;
          if (event.currentTarget.value !== next) event.currentTarget.value = next;
          onchange(next);
        }}
        {onblur}
      />
    {/if}

    {#if error}
      <p class="field-error" id="{id}-error">
        <AlertCircle size={16} aria-hidden="true" />
        {error}
      </p>
    {:else if hintText}
      <p class="field-hint" id="{id}-hint">{hintText}</p>
    {/if}
  </div>
{/if}

<style>
  .toggle-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toggle-label {
    align-items: center;
    display: inline-flex;
    font-size: 13px;
    gap: 8px;
    min-height: 32px;
  }

  .toggle-label input {
    height: 18px;
    width: 18px;
  }
</style>

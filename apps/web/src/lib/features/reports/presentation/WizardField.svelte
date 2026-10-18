<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  /**
   * Foundation §4.2 form field: label above, `*` for required, "Optional" spelled
   * out, error below with an alert icon (never colour alone). The control is a
   * snippet so it receives `aria-invalid` and `aria-describedby`.
   *
   * `flagged` marks a field named in a return comment (phase 07); the word travels
   * with the maroon edge so the state is never colour alone.
   */
  let {
    id,
    label,
    required = false,
    optional = false,
    flagged = false,
    hint,
    error,
    children,
  }: {
    id: string;
    label: string;
    required?: boolean;
    optional?: boolean;
    flagged?: boolean;
    hint?: string;
    error?: string;
    children: Snippet<[{ describedBy: string | undefined; invalid: boolean }]>;
  } = $props();

  const describedBy = $derived(error ? `${id}-error` : hint ? `${id}-hint` : undefined);
</script>

<div class="field" class:has-error={Boolean(error)} class:is-flagged={flagged}>
  <label class="field-label" for={id}>
    <span>
      {label}{#if required}<span class="required" aria-hidden="true"> *</span>{/if}
      {#if flagged}<span class="flag">Flagged</span>{/if}
    </span>
    {#if optional}<span class="field-optional">Optional</span>{/if}
  </label>

  {@render children({ describedBy, invalid: Boolean(error) })}

  {#if error}
    <p class="field-error" id="{id}-error">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{error}</span>
    </p>
  {:else if hint}
    <p class="field-hint" id="{id}-hint">{hint}</p>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field.is-flagged {
    border-left: 2px solid var(--brand-maroon-800);
    padding-left: 8px;
  }

  .flag {
    background: var(--status-danger-bg);
    border-radius: var(--radius-badge);
    color: var(--status-danger-fg);
    font-size: 11px;
    font-weight: 500;
    margin-left: 8px;
    padding: 1px 6px;
  }

  .required {
    color: var(--status-danger-fg);
  }
</style>

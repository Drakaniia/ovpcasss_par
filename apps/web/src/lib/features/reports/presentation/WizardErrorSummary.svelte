<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

  import type { WizardForm } from '../application/record-form';
  import {
    domIdForField,
    labelFor,
    orderedErrors,
    type FieldErrors,
  } from '../application/record-validation';

  /**
   * The advanced-attempt summary (bug phase 02 §3.4). It appears because the
   * reporter tried to leave the step, never because a blur produced a message.
   */
  let {
    errors,
    form,
    onfocus,
  }: {
    errors: FieldErrors;
    form: WizardForm;
    onfocus?: (domId: string | undefined) => void;
  } = $props();

  const fields = $derived(orderedErrors(errors, form));

  function focus(field: string): void {
    const id = domIdForField(field);
    if (id) onfocus?.(id);
  }
</script>

<div class="summary" role="alert" tabindex="-1">
  <p class="summary-title">
    <AlertCircle size={16} aria-hidden="true" />
    <span>Check the highlighted {fields.length === 1 ? 'field' : 'fields'}.</span>
  </p>
  <ul>
    {#each fields as field (field)}
      <li>
        <button class="link" type="button" onclick={() => focus(field)}>
          {labelFor(field, form)}: {errors[field]}
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .summary {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    margin-bottom: 16px;
    padding: 10px 14px;
  }

  .summary-title {
    align-items: center;
    display: flex;
    font-size: 13px;
    font-weight: 500;
    gap: 6px;
    margin: 0;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }

  .link {
    background: none;
    border: 0;
    color: inherit;
    font-size: 12px;
    padding: 0;
    text-align: left;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>

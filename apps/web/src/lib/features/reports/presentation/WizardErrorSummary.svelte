<script lang="ts">
  import type { WizardForm } from '../application/wizard-form';
  import {
    errorSummary,
    fieldDomId,
    type FieldErrors,
  } from '../application/wizard-validation';

  /**
   * Foundation §4.2: every wizard step starts with a linked summary of its
   * problems, and the first link points at the first invalid field.
   */
  let { errors, form }: { errors: FieldErrors; form: WizardForm } = $props();

  const issues = $derived(errorSummary(form, errors));

  function focusField(field: string): void {
    document.getElementById(fieldDomId(field))?.focus();
  }
</script>

{#if issues.length > 0}
  <div class="error-summary" id="wizard-error-summary" role="alert" tabindex="-1">
    <p>Check the highlighted fields and try again.</p>
    <ul>
      {#each issues as issue (issue.field)}
        <li>
          <a
            href="#{fieldDomId(issue.field)}"
            onclick={(event) => {
              event.preventDefault();
              focusField(issue.field);
            }}>{issue.label}: {issue.message}</a
          >
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .error-summary p {
    margin: 0 0 6px;
  }

  .error-summary ul {
    margin: 0;
    padding-left: 18px;
  }

  .error-summary a {
    color: inherit;
  }
</style>

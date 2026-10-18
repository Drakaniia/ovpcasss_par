<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import type { ReportValidationIssue } from '@par/shared';

  import AttachmentUploader from '$lib/features/attachments/presentation/AttachmentUploader.svelte';
  import type { AttachmentItem } from '$lib/features/attachments/application/attachment-items';

  import type { CompletenessItem } from '../application/wizard-completeness';
  import type { ReviewSection } from '../application/wizard-review';
  import type { WizardForm, WizardStep } from '../application/wizard-form';
  import { fieldDomId, type FieldErrors } from '../application/wizard-validation';
  import ReviewSummary from './ReviewSummary.svelte';
  import WizardField from './WizardField.svelte';

  /**
   * Step 4 — narrative, attachments, completeness, and review (UI phase 06 §3).
   * The server's own field list is rendered here; its rules are never
   * re-implemented in the client.
   */
  let {
    form,
    errors,
    sections,
    completeness,
    attachments = $bindable<AttachmentItem[]>([]),
    reportId,
    labelOptions,
    ensureReportId,
    serverIssues,
    submitError,
    onnarrative,
    onedit,
    onsubmit,
  }: {
    form: WizardForm;
    errors: FieldErrors;
    sections: ReviewSection[];
    completeness: CompletenessItem[];
    attachments?: AttachmentItem[];
    reportId: string | null;
    labelOptions: readonly string[];
    ensureReportId: () => Promise<string>;
    serverIssues: ReportValidationIssue[];
    submitError?: { message: string; requestId?: string } | null;
    onnarrative: (text: string) => void;
    onedit: (step: WizardStep) => void;
    onsubmit: () => void;
  } = $props();

  const missing = $derived(completeness.filter((item) => !item.complete));

  function focusIssue(issue: ReportValidationIssue): void {
    const element = document.getElementById(fieldDomId(issue.field));
    if (element) {
      element.focus();
      return;
    }
    onedit((issue.step as WizardStep | undefined) ?? 4);
  }
</script>

<div class="review-step">
  {#if submitError}
    <div class="form-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <div>
        <p class="alert-message">{submitError.message}</p>
        {#if submitError.requestId}
          <p class="request-id">Request ID: <span class="mono">{submitError.requestId}</span></p>
        {/if}
        <button class="alert-retry" type="button" onclick={onsubmit}>Retry</button>
      </div>
    </div>
  {/if}

  {#if serverIssues.length > 0}
    <div class="error-summary" role="alert" tabindex="-1">
      <p>The report is not ready to submit. Update the highlighted items and try again.</p>
      <ul>
        {#each serverIssues as issue (issue.field + issue.message)}
          <li>
            <button type="button" onclick={() => focusIssue(issue)}>{issue.message}</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <section class="block" aria-labelledby="wiz-narrative-heading">
    <h2 id="wiz-narrative-heading">Narrative</h2>
    <WizardField
      id="wiz-narrative"
      label="Narrative of the activity"
      error={errors.narrative}
      required
      hint="Formatting is limited to paragraphs; line breaks are preserved."
    >
      {#snippet children({ describedBy, invalid })}
        <textarea
          id="wiz-narrative"
          class="textarea"
          rows="10"
          spellcheck="true"
          value={form.narrative}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          oninput={(event) => onnarrative(event.currentTarget.value)}
        ></textarea>
      {/snippet}
    </WizardField>
  </section>

  <section class="block" aria-labelledby="wiz-attachments-heading">
    <h2 id="wiz-attachments-heading">Attachments</h2>
    <AttachmentUploader
      bind:items={attachments}
      {reportId}
      {labelOptions}
      {ensureReportId}
    />
  </section>

  <section class="block" aria-labelledby="wiz-completeness-heading">
    <h2 id="wiz-completeness-heading">Before you submit</h2>
    {#if missing.length === 0}
      <p class="complete-note">All five completeness items are complete.</p>
    {:else}
      <ul class="missing-list">
        {#each missing as item (item.id)}
          <li>
            <button type="button" onclick={() => onedit(item.step)}>
              {item.id === 'attachments' && item.missing?.length
                ? `${item.label} — ${item.missing.join(', ')} required`
                : item.label}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="block" aria-labelledby="wiz-review-heading">
    <h2 id="wiz-review-heading">Review</h2>
    <ReviewSummary {sections} {onedit} />
  </section>
</div>

<style>
  .review-step {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h2 {
    font-size: 15px;
    margin: 0;
  }

  .form-alert {
    align-items: flex-start;
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    font-size: 13px;
    gap: 8px;
    padding: 12px 16px;
  }

  .alert-message {
    margin: 0;
  }

  .request-id {
    font-size: 12px;
    margin: 4px 0 0;
  }

  .mono {
    font-family: var(--font-mono);
  }

  .alert-retry {
    background: none;
    border: 0;
    color: inherit;
    font-size: 13px;
    margin-top: 6px;
    padding: 0;
    text-decoration: underline;
  }

  .missing-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .missing-list button {
    background: none;
    border: 0;
    color: var(--link);
    font-size: 13px;
    padding: 4px 0;
    text-align: left;
  }

  .missing-list button:hover {
    text-decoration: underline;
  }

  .complete-note {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }
</style>

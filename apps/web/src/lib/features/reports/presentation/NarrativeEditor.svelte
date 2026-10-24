<script lang="ts">
  import { validateNarrative, type ReportDetail, type ValidationIssue } from '@par/shared';
  import { Send } from '@lucide/svelte';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError, validationIssues } from '$lib/api/http';
  import {
    itemFromAttachment,
    type AttachmentItem,
  } from '$lib/features/attachments/application/attachment-items';
  import AttachmentUploader from '$lib/features/attachments/presentation/AttachmentUploader.svelte';
  import { invalidateInboxAttention } from '$lib/session/inbox-attention.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import { applyMarkdown, type MarkdownCommand } from '../application/narrative-markdown';
  import NarrativeMarkdown from './NarrativeMarkdown.svelte';
  import NarrativeToolbar from './NarrativeToolbar.svelte';
  import SignatureCard from './SignatureCard.svelte';

  /**
   * The personnel in charge write the narrative here (spec §8.3). Save draft is
   * secondary; Submit narrative is the single filled action on the screen and is
   * available only while the record is PENDING or RETURNED. The draft lives on
   * the record alone — nothing is written to browser storage. The formatted page
   * renders below the textarea as it is typed, so a toolbar command shows its
   * result without a mode switch. Formatting is the Markdown subset the parser in
   * `@par/shared` understands (report 7), and a refused submission names the
   * field it is about (report 8).
   */
  let {
    detail,
    onreload,
  }: {
    detail: ReportDetail;
    onreload: () => Promise<void>;
  } = $props();

  let narrative = $state(detail.form.narrative);
  let attachments = $state<AttachmentItem[]>(
    detail.attachments.map((attachment) => itemFromAttachment(attachment)),
  );
  let saving = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let issues = $state<ValidationIssue[]>([]);
  let savedAt = $state<string | null>(null);
  let signatureSigned = $state(Boolean(detail.narrativeSignature));
  let textarea = $state<HTMLTextAreaElement | null>(null);
  let attachmentsBlock = $state<HTMLElement | null>(null);
  const idempotencyKey = crypto.randomUUID();

  const editable = $derived(detail.status === 'PENDING' || detail.status === 'RETURNED');
  const dirty = $derived(narrative !== detail.form.narrative);
  const narrativeIssue = $derived(
    issues.find((issue) => issue.field === 'narrative')?.message ?? null,
  );
  const attachmentIssue = $derived(
    issues.find((issue) => issue.field === 'attachments')?.message ?? null,
  );

  function updateNarrative(value: string): void {
    narrative = value;

    // Typing answers the narrative complaint; the attachments one stays.
    issues = issues.filter((issue) => issue.field !== 'narrative');
    error = null;
  }

  async function format(command: MarkdownCommand): Promise<void> {
    if (!textarea) return;

    const result = applyMarkdown(
      command,
      narrative,
      textarea.selectionStart,
      textarea.selectionEnd,
    );
    updateNarrative(result.value);

    await tick();
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  }

  /** The same rules the API applies, so a doomed submit never leaves the page. */
  function localIssues(): ValidationIssue[] {
    return validateNarrative(narrative, {
      attachments: attachments.map((item) => ({
        label: item.label,
        status: item.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
        fileName: item.fileName,
      })),
    });
  }

  async function focusIssues(): Promise<void> {
    await tick();

    if (issues.some((issue) => issue.field === 'narrative')) {
      textarea?.focus();
      return;
    }

    attachmentsBlock?.focus();
  }

  async function saveDraft(): Promise<boolean> {
    if (saving || submitting) return false;
    saving = true;
    error = null;

    try {
      await api.reports.saveNarrative(detail.id, { narrative });
      savedAt = new Date().toISOString();
      toast.success('Narrative draft saved.');
      return true;
    } catch (failure) {
      error = failure instanceof ApiError ? failure.message : 'The draft was not saved. Try again.';
      return false;
    } finally {
      saving = false;
    }
  }

  async function submit(): Promise<void> {
    if (saving || submitting) return;

    const blocked = localIssues();
    if (blocked.length > 0) {
      issues = blocked;
      error = null;
      await focusIssues();
      return;
    }

    submitting = true;
    error = null;
    issues = [];

    try {
      if (dirty) await api.reports.saveNarrative(detail.id, { narrative });
      await api.reports.submit(detail.id, idempotencyKey);
      invalidateInboxAttention();
      toast.success('Narrative submitted. The office will review it.');
      await onreload();
    } catch (failure) {
      const details = validationIssues(failure);

      if (details.length > 0) {
        issues = details;
        await focusIssues();
      } else {
        error =
          failure instanceof ApiError
            ? failure.message
            : 'The narrative was not submitted. Try again.';
      }
    } finally {
      submitting = false;
    }
  }

  function onSignature(detailNext: ReportDetail): void {
    signatureSigned = Boolean(detailNext.narrativeSignature);
  }
</script>

<section class="narrative-editor" aria-labelledby="narrative-title">
  <h2 id="narrative-title">Narrative report</h2>

  {#if editable}
    <p class="lede">
      Write what happened, what the activity achieved, and anything the office should know. You can
      save a draft and come back before submitting.
    </p>

    <div class="field-head">
      <label class="field-label" for="narrative">Narrative</label>
    </div>

    <NarrativeToolbar oncommand={(command) => void format(command)} disabled={submitting} />
    <textarea
      bind:this={textarea}
      id="narrative"
      class="textarea narrative-input"
      rows="12"
      maxlength="50000"
      placeholder="Write the narrative report."
      aria-describedby={['narrative-hint', narrativeIssue ? 'narrative-error' : '', error ? 'submit-error' : '']
        .filter(Boolean)
        .join(' ')}
      aria-invalid={narrativeIssue ? 'true' : undefined}
      value={narrative}
      oninput={(event) => updateNarrative(event.currentTarget.value)}></textarea>
    <p class="hint" id="narrative-hint">
      Formatting: # Heading 1, ## Heading 2, **bold**, *italic*, __underline__, - list, 1. list.
    </p>

    <!-- Live preview: the formatted page follows every keystroke and toolbar command. -->
    <section class="preview-block" aria-labelledby="narrative-preview-title">
      <h3 id="narrative-preview-title">Preview</h3>
      <div class="preview">
        <NarrativeMarkdown source={narrative} />
      </div>
    </section>

    {#if narrativeIssue}
      <p class="field-error" id="narrative-error" role="alert">{narrativeIssue}</p>
    {/if}

    <div class="attachment-block" bind:this={attachmentsBlock} tabindex="-1">
      <h3>Attachments</h3>
      <p class="hint">Optional supporting files. Each file is private to the office.</p>
      {#if attachmentIssue}
        <p class="field-error" id="attachment-error" role="alert">{attachmentIssue}</p>
      {/if}
      <AttachmentUploader
        bind:items={attachments}
        reportId={detail.id}
        ensureReportId={async () => detail.id}
        labelOptions={[]}
        disabled={submitting}
      />
    </div>

    <SignatureCard
      reportId={detail.id}
      signed={signatureSigned}
      canEdit={editable}
      onchanged={onSignature}
    />

    {#if error}
      <p class="field-error" id="submit-error" role="alert">{error}</p>
    {/if}

    <div class="editor-actions">
      <button
        class="btn btn-outline"
        type="button"
        disabled={saving || submitting}
        onclick={() => void saveDraft()}
      >
        {saving ? 'Saving…' : 'Save draft'}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        disabled={saving || submitting}
        onclick={() => void submit()}
      >
        <Send size={16} aria-hidden="true" />
        {submitting ? 'Submitting…' : 'Submit narrative'}
      </button>
    </div>

    {#if savedAt}
      <p class="saved-line" role="status">Draft saved.</p>
    {/if}
  {:else}
    <p class="lede">
      The narrative below was submitted and is read-only. The office decides on it from here.
    </p>
  {/if}
</section>

<style>
  .narrative-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h2 {
    margin: 0;
  }

  h3 {
    font-size: 14px;
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .field-head {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .field-label {
    font-size: 13px;
    font-weight: 500;
  }

  .narrative-input {
    font-family: var(--font-ui);
    line-height: 1.55;
    min-height: 220px;
    resize: vertical;
  }

  .preview-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preview {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    min-height: 120px;
    padding: 12px 14px;
  }

  .field-error {
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 0;
  }

  .attachment-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .editor-actions {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 6px;
    padding-top: 12px;
  }

  .editor-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .saved-line {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    text-align: right;
  }
</style>

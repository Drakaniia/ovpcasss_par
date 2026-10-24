<script lang="ts">
  import { validateNarrative, type ReportDetail, type ValidationIssue } from '@par/shared';
  import { Send } from '@lucide/svelte';
  import { onMount, tick } from 'svelte';

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
   * available only while the record is PENDING or RETURNED. A local mirror keeps
   * the text through a dropped connection; the server draft always wins until
   * the writer chooses the device copy. Formatting is the Markdown subset the
   * parser in `@par/shared` understands (report 7), and a refused submission
   * names the field it is about (report 8).
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
  let view = $state<'write' | 'preview'>('write');
  let textarea = $state<HTMLTextAreaElement | null>(null);
  let attachmentsBlock = $state<HTMLElement | null>(null);
  /** A local copy that disagrees with a later server draft is never auto-applied. */
  let mirrorConflict = $state<string | null>(null);
  const idempotencyKey = crypto.randomUUID();
  const mirrorKey = `par-narrative:${detail.id}`;

  const editable = $derived(detail.status === 'PENDING' || detail.status === 'RETURNED');
  const dirty = $derived(narrative !== detail.form.narrative);
  const narrativeIssue = $derived(
    issues.find((issue) => issue.field === 'narrative')?.message ?? null,
  );
  const attachmentIssue = $derived(
    issues.find((issue) => issue.field === 'attachments')?.message ?? null,
  );

  type Mirror = { narrative: string; updatedAt: string };

  function readMirror(): Mirror | null {
    try {
      const raw = localStorage.getItem(mirrorKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<Mirror>;
      return typeof parsed.narrative === 'string' && typeof parsed.updatedAt === 'string'
        ? { narrative: parsed.narrative, updatedAt: parsed.updatedAt }
        : null;
    } catch {
      return null;
    }
  }

  function writeMirror(value: string): void {
    try {
      localStorage.setItem(
        mirrorKey,
        JSON.stringify({ narrative: value, updatedAt: detail.updatedAt }),
      );
    } catch {
      // A full or unavailable store only costs the offline copy.
    }
  }

  onMount(() => {
    if (!editable) return;
    const mirror = readMirror();
    if (!mirror || mirror.narrative === narrative) return;

    if (!detail.form.narrative.trim()) {
      narrative = mirror.narrative;
      return;
    }

    if (mirror.updatedAt !== detail.updatedAt) mirrorConflict = mirror.narrative;
  });

  function useMirror(): void {
    if (mirrorConflict === null) return;
    narrative = mirrorConflict;
    mirrorConflict = null;
  }

  function discardMirror(): void {
    mirrorConflict = null;
    try {
      localStorage.removeItem(mirrorKey);
    } catch {
      // Nothing to clear.
    }
  }

  function updateNarrative(value: string): void {
    narrative = value;
    writeMirror(value);

    // Typing answers the narrative complaint; the attachments one stays.
    issues = issues.filter((issue) => issue.field !== 'narrative');
    error = null;
  }

  async function format(command: MarkdownCommand): Promise<void> {
    if (!textarea) return;

    view = 'write';
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
      view = 'write';
      await tick();
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
      try {
        localStorage.removeItem(mirrorKey);
      } catch {
        // Nothing to clear.
      }
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
      <div class="view-switch" role="tablist" aria-label="Narrative view">
        <button
          class="view-tab"
          class:is-active={view === 'write'}
          type="button"
          role="tab"
          aria-selected={view === 'write'}
          onclick={() => (view = 'write')}>Write</button
        >
        <button
          class="view-tab"
          class:is-active={view === 'preview'}
          type="button"
          role="tab"
          aria-selected={view === 'preview'}
          onclick={() => (view = 'preview')}>Preview</button
        >
      </div>
    </div>

    {#if view === 'write'}
      <NarrativeToolbar oncommand={(command) => void format(command)} disabled={submitting} />
      <textarea
        bind:this={textarea}
        id="narrative"
        class="textarea narrative-input"
        rows="12"
        maxlength="50000"
        placeholder="Write the narrative report."
        aria-describedby={[
          'narrative-hint',
          narrativeIssue ? 'narrative-error' : '',
          error ? 'submit-error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={narrativeIssue ? 'true' : undefined}
        value={narrative}
        oninput={(event) => updateNarrative(event.currentTarget.value)}></textarea>
      <p class="hint" id="narrative-hint">
        Formatting: # Heading 1, ## Heading 2, **bold**, *italic*, __underline__, - list, 1. list.
      </p>
    {:else}
      <div class="preview" role="tabpanel" aria-label="Narrative preview">
        <NarrativeMarkdown source={narrative} />
      </div>
    {/if}

    {#if narrativeIssue}
      <p class="field-error" id="narrative-error" role="alert">{narrativeIssue}</p>
    {/if}

    {#if mirrorConflict !== null}
      <div class="mirror-notice" role="status">
        <p>
          This device holds a copy of the narrative that differs from the draft saved on the record.
          Choose which text to keep.
        </p>
        <div class="mirror-actions">
          <button class="btn btn-outline btn-sm" type="button" onclick={useMirror}>
            Use this device's copy
          </button>
          <button class="btn btn-ghost btn-sm" type="button" onclick={discardMirror}>
            Keep the record's draft
          </button>
        </div>
      </div>
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
    justify-content: space-between;
  }

  .field-label {
    font-size: 13px;
    font-weight: 500;
  }

  .view-switch {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: 999px;
    display: inline-flex;
    padding: 2px;
  }

  .view-tab {
    background: transparent;
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 12px;
    height: 26px;
    padding: 0 10px;
  }

  .view-tab.is-active {
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
    color: var(--text-primary);
  }

  .narrative-input {
    font-family: var(--font-ui);
    line-height: 1.55;
    min-height: 220px;
    resize: vertical;
  }

  .preview {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    min-height: 220px;
    padding: 12px 14px;
  }

  .mirror-notice {
    background: var(--status-warning-bg);
    border-radius: var(--radius-card);
    color: var(--status-warning-fg);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
  }

  .mirror-notice p {
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }

  .mirror-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
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

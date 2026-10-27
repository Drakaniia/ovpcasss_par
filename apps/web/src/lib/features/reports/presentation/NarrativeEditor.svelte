<script lang="ts">
  import {
    parseNarrative,
    validateNarrative,
    type NarrativeBlock,
    type NarrativeInline,
    type ReportDetail,
    type ValidationIssue,
  } from '@par/shared';
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

  import { narrativeFromEditor, type NarrativeCommand } from '../application/narrative-editor';
  import NarrativeToolbar from './NarrativeToolbar.svelte';
  import SignatureCard from './SignatureCard.svelte';

  /**
   * The personnel in charge write the narrative here (spec §8.3). Save draft is
   * secondary; Submit narrative is the single filled action on the screen and is
   * available only while the record is PENDING or RETURNED. The draft lives on
   * the record alone — nothing is written to browser storage.
   *
   * The narrative is one surface: what is typed is already the formatted page,
   * with no separate preview and no Markdown typed or shown. The record keeps
   * the Markdown subset `@par/shared` parses, so the read-only record, print
   * sheet, facsimile, and PDFs read the same text; `narrative-editor.ts` turns
   * the surface back into it. A refused submission names the field it is about
   * (report 8).
   */
  let {
    detail,
    onreload,
  }: {
    detail: ReportDetail;
    onreload: () => Promise<void>;
  } = $props();

  /** The one thing the editor asks of the signature card: save what is drawn. */
  type SignatureCardHandle = { savePending: () => Promise<boolean> };

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
  let signatureCard = $state<SignatureCardHandle | null>(null);
  let editor = $state<HTMLElement | null>(null);
  let attachmentsBlock = $state<HTMLElement | null>(null);
  let lastExternal = detail.form.narrative;
  const idempotencyKey = crypto.randomUUID();

  onMount(() => {
    if (!editor) return;

    // Prefer real elements over styled spans, and a paragraph per Enter.
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('defaultParagraphSeparator', false, 'p');
    fillNarrative(editor, narrative);
  });

  // A reloaded record (or one replaced under the panel) refills the surface;
  // typing never reaches this branch because the draft, not the prop, changes.
  $effect(() => {
    const external = detail.form.narrative;
    if (external === lastExternal) return;

    lastExternal = external;
    narrative = external;
    if (editor) fillNarrative(editor, external);
  });

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

  function appendInline(target: HTMLElement, spans: NarrativeInline[]): void {
    for (const span of spans) {
      let node: Node = document.createTextNode(span.text);
      if (span.underline) node = wrap('u', node);
      if (span.italic) node = wrap('em', node);
      if (span.bold) node = wrap('strong', node);
      target.append(node);
    }
  }

  function wrap(tag: 'u' | 'em' | 'strong', child: Node): HTMLElement {
    const element = document.createElement(tag);
    element.append(child);
    return element;
  }

  function blockElement(block: NarrativeBlock): HTMLElement {
    if (block.kind === 'heading') {
      // Source heading 1-3 becomes h3-h5 so the panel keeps ownership of h2.
      const heading = document.createElement(`h${block.level + 2}`);
      appendInline(heading, block.spans);
      return heading;
    }

    if (block.kind === 'list') {
      const list = document.createElement(block.ordered ? 'ol' : 'ul');
      for (const item of block.items) {
        const row = document.createElement('li');
        appendInline(row, item);
        list.append(row);
      }
      return list;
    }

    const paragraph = document.createElement('p');
    block.lines.forEach((line, index) => {
      if (index > 0) paragraph.append(document.createElement('br'));
      appendInline(paragraph, line);
    });
    return paragraph;
  }

  /** Fills the editable surface from the stored narrative. */
  function fillNarrative(target: HTMLElement, source: string): void {
    target.replaceChildren();
    for (const block of parseNarrative(source)) target.append(blockElement(block));
    target.dataset.empty = target.childNodes.length === 0 ? 'true' : 'false';
  }

  /** Reads the surface back into the stored narrative after every edit. */
  function syncFromEditor(): void {
    if (!editor) return;

    const value = narrativeFromEditor(editor);
    updateNarrative(value);
    editor.dataset.empty = value === '' ? 'true' : 'false';
  }

  function selectionInEditor(): boolean {
    const anchor = window.getSelection()?.anchorNode ?? null;
    return Boolean(editor && anchor && editor.contains(anchor));
  }

  function currentBlockTag(): string {
    let node: Node | null = window.getSelection()?.anchorNode ?? null;

    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName;
        if (/^(H[1-6]|P|DIV|LI)$/.test(tag)) return tag;
      }
      node = node.parentNode;
    }

    return '';
  }

  function applyCommand(command: NarrativeCommand): void {
    if (command === 'h1' || command === 'h2') {
      const tag = command === 'h1' ? 'h3' : 'h4';
      const active = currentBlockTag() === tag.toUpperCase();
      document.execCommand('formatBlock', false, active ? 'p' : tag);
      return;
    }

    if (command === 'bullet') {
      document.execCommand('insertUnorderedList');
      return;
    }

    if (command === 'number') {
      document.execCommand('insertOrderedList');
      return;
    }

    document.execCommand(command);
  }

  /** A toolbar command formats the text in place; the page is the preview. */
  async function format(command: NarrativeCommand): Promise<void> {
    if (!editor || submitting) return;
    if (!selectionInEditor()) editor.focus();

    applyCommand(command);
    syncFromEditor();

    await tick();
    editor.focus();
  }

  function onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) return;

    // Only the words are pasted; foreign markup never reaches the record.
    event.preventDefault();
    document.execCommand('insertText', false, text);
    syncFromEditor();
  }

  function onBeforeInput(event: InputEvent): void {
    if (!event.inputType.startsWith('insert') || narrative.length < 50_000) return;

    event.preventDefault();
    error = 'The narrative is limited to 50,000 characters.';
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
      editor?.focus();
      return;
    }

    attachmentsBlock?.focus();
  }

  async function saveDraft(): Promise<boolean> {
    if (saving || submitting) return false;
    saving = true;
    error = null;

    try {
      // A drawn or uploaded signature is kept with the draft too, so saving the
      // text alone never strands the image. Its failure does not cost the draft.
      const signatureSaved = (await signatureCard?.savePending()) ?? true;

      await api.reports.saveNarrative(detail.id, { narrative });
      savedAt = new Date().toISOString();
      toast.success(
        signatureSaved ? 'Narrative draft saved.' : 'Narrative draft saved. The signature was not.',
      );
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
      // A signature that was drawn or uploaded but not saved travels with the
      // submission: submit snapshots what the record holds, so one button does
      // both. A failed save stops the submit rather than losing the image.
      if (!((await signatureCard?.savePending()) ?? true)) {
        error = 'The signature was not saved, so the narrative was not submitted. Try again.';
        return;
      }

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
      <span class="field-label" id="narrative-label">Narrative</span>
    </div>

    <NarrativeToolbar oncommand={(command) => void format(command)} disabled={submitting} />

    <!-- One surface: what is typed is already the formatted page. -->
    <div
      bind:this={editor}
      id="narrative"
      class="textarea narrative-input"
      role="textbox"
      aria-multiline="true"
      aria-labelledby="narrative-label"
      aria-describedby={[
        'narrative-hint',
        narrativeIssue ? 'narrative-error' : '',
        error ? 'submit-error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={narrativeIssue ? 'true' : undefined}
      contenteditable={submitting ? 'false' : 'true'}
      data-empty={narrative.trim() === '' ? 'true' : 'false'}
      data-placeholder="Write the narrative report."
      spellcheck="true"
      oninput={syncFromEditor}
      onpaste={onPaste}
      onbeforeinput={onBeforeInput}
    ></div>
    <p class="hint" id="narrative-hint">
      Select text to format it. The page is the report; nothing is written in Markdown.
    </p>

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
      bind:this={signatureCard}
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
    line-height: 1.6;
    min-height: 260px;
    overflow-y: auto;
    overflow-wrap: anywhere;
    padding: 12px 14px;
  }

  .narrative-input[data-empty='true']::before {
    color: var(--text-secondary);
    content: attr(data-placeholder);
    pointer-events: none;
  }

  .narrative-input :global(h3),
  .narrative-input :global(h4),
  .narrative-input :global(h5) {
    font-size: 14px;
    margin: 0 0 6px;
  }

  .narrative-input :global(h4) {
    font-size: 13px;
  }

  .narrative-input :global(h5) {
    font-size: 13px;
    font-weight: 600;
  }

  .narrative-input :global(p) {
    margin: 0 0 8px;
  }

  .narrative-input :global(p:last-child) {
    margin-bottom: 0;
  }

  .narrative-input :global(ul),
  .narrative-input :global(ol) {
    margin: 0 0 8px;
    padding-left: 20px;
  }

  .narrative-input :global(li) {
    margin: 2px 0;
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

<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { Send } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import {
    itemFromAttachment,
    type AttachmentItem,
  } from '$lib/features/attachments/application/attachment-items';
  import AttachmentUploader from '$lib/features/attachments/presentation/AttachmentUploader.svelte';
  import { invalidateInboxAttention } from '$lib/session/inbox-attention.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import SignatureCard from './SignatureCard.svelte';

  /**
   * The personnel in charge write the narrative here (spec §8.3). Save draft is
   * secondary; Submit narrative is the single filled action on the screen and is
   * available only while the record is PENDING or RETURNED. A local mirror keeps
   * the text through a dropped connection; the server draft always wins until
   * the writer chooses the device copy.
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
  let savedAt = $state<string | null>(null);
  let signatureSigned = $state(Boolean(detail.narrativeSignature));
  /** A local copy that disagrees with a later server draft is never auto-applied. */
  let mirrorConflict = $state<string | null>(null);
  const idempotencyKey = crypto.randomUUID();
  const mirrorKey = `par-narrative:${detail.id}`;

  const editable = $derived(detail.status === 'PENDING' || detail.status === 'RETURNED');
  const dirty = $derived(narrative !== detail.form.narrative);

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
    submitting = true;
    error = null;

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
      error =
        failure instanceof ApiError
          ? failure.message
          : 'The narrative was not submitted. Try again.';
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

    <label class="field-label" for="narrative">Narrative</label>
    <textarea
      id="narrative"
      class="textarea narrative-input"
      rows="12"
      maxlength="50000"
      placeholder="Write the narrative report."
      aria-describedby={error ? 'narrative-error' : undefined}
      aria-invalid={error ? 'true' : undefined}
      value={narrative}
      oninput={(event) => updateNarrative(event.currentTarget.value)}></textarea>

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

    {#if error}
      <p class="field-error" id="narrative-error" role="alert">{error}</p>
    {/if}

    <div class="attachment-block">
      <h3>Attachments</h3>
      <p class="hint">Optional supporting files. Each file is private to the office.</p>
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

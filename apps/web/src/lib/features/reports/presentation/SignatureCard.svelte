<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { PenLine, Trash2 } from '@lucide/svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import SignatureCapture from '$lib/features/profile/presentation/SignatureCapture.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import SignatureImage from './SignatureImage.svelte';

  /**
   * The narrative signature (signature spec §4.4, report 3). Optional: the
   * printed record simply keeps its rule blank. The writer draws or uploads the
   * image here, as on the Settings page, instead of leaving the record to reuse
   * the profile copy. The API snapshots the image onto the record, so replacing
   * the profile later never changes a submitted report.
   */
  let {
    reportId,
    signed,
    canEdit,
    onchanged,
  }: {
    reportId: string;
    signed: boolean;
    canEdit: boolean;
    onchanged: (detail: ReportDetail) => void;
  } = $props();

  let busy = $state(false);
  let error = $state<string | null>(null);
  /** A drawn or uploaded image that has not been saved to the record yet. */
  let pending = $state<string | null>(null);
  /** True while the capture is open; a signed record starts on its preview. */
  let capturing = $state(!signed);

  function failureText(failure: unknown, fallback: string): string {
    return failure instanceof ApiError ? failure.message : fallback;
  }

  function startReplacing(): void {
    pending = null;
    error = null;
    capturing = true;
  }

  function cancelReplace(): void {
    pending = null;
    error = null;
    capturing = signed;
  }

  async function save(options: { quiet?: boolean } = {}): Promise<boolean> {
    if (!canEdit || busy || !pending) return false;
    busy = true;
    error = null;

    try {
      onchanged(await api.reports.setSignature(reportId, { image: pending }));
      pending = null;
      capturing = false;
      if (!options.quiet) toast.success('Signature added to this record.');
      return true;
    } catch (failure) {
      error = failureText(failure, 'The signature was not saved. Try again.');
      return false;
    } finally {
      busy = false;
    }
  }

  /**
   * Saves an image that was drawn or uploaded but not saved yet. The narrative
   * editor asks for this before submitting, so writing and signing stay one
   * action; the writer no longer has to save the signature first. A `false`
   * answer stops the submission and the card names what went wrong.
   */
  export async function savePending(): Promise<boolean> {
    if (!pending) return true;
    return save({ quiet: true });
  }

  async function remove(): Promise<void> {
    if (!canEdit || busy) return;
    busy = true;
    error = null;

    try {
      onchanged(await api.reports.removeSignature(reportId));
      pending = null;
      capturing = true;
      toast.success('Signature removed from this record.');
    } catch (failure) {
      error = failureText(failure, 'The signature was not removed. Try again.');
    } finally {
      busy = false;
    }
  }
</script>

<div class="signature-card">
  <div class="signature-head">
    <p class="signature-label">Your signature</p>
    <p class="signature-hint">
      Optional. Draw or upload it here; it is saved with the draft or the submission, or use Save
      signature to keep it now. A signature saved in Settings is still used if this card stays empty.
    </p>
  </div>

  {#if error}
    <p class="field-error" role="alert">{error}</p>
  {/if}

  {#if signed && !capturing}
    <SignatureImage {reportId} alt="Your saved signature on this record" />

    {#if canEdit}
      <div class="signature-actions">
        <button
          class="btn btn-outline btn-sm"
          type="button"
          disabled={busy}
          onclick={startReplacing}
        >
          <PenLine size={14} aria-hidden="true" /> Replace signature
        </button>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          disabled={busy}
          onclick={() => void remove()}
        >
          <Trash2 size={14} aria-hidden="true" /> Remove signature
        </button>
      </div>
    {/if}
  {:else if canEdit}
    <SignatureCapture onchange={(dataUrl) => (pending = dataUrl)} />

    <div class="signature-actions">
      {#if signed}
        <button class="btn btn-ghost btn-sm" type="button" disabled={busy} onclick={cancelReplace}>
          Cancel
        </button>
      {/if}
      <button
        class="btn btn-outline btn-sm"
        type="button"
        disabled={busy || !pending}
        onclick={() => void save()}
      >
        <PenLine size={14} aria-hidden="true" />
        {busy ? 'Saving…' : 'Save signature'}
      </button>
      {#if !pending && !busy}
        <span class="save-reason">Draw or upload a signature first.</span>
      {/if}
    </div>
  {:else if signed}
    <SignatureImage {reportId} alt="Signature on this record" />
  {/if}
</div>

<style>
  .signature-card {
    align-items: flex-start;
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
  }

  .signature-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .signature-label {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }

  .signature-hint {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .field-error {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 0;
  }

  .signature-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .signature-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .save-reason {
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>

<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { PenLine, Trash2 } from '@lucide/svelte';

  import { api } from '$lib/api/client';
  import { toast } from '$lib/toast/toast.svelte';

  import SignatureImage from './SignatureImage.svelte';

  /**
   * The narrative signature (signature spec §4.4). Optional: the printed record
   * simply keeps its rule blank. Saving in Settings is enough — the API copies
   * the profile image at submit when this card was never used (phase 05).
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

  async function useProfile(): Promise<void> {
    if (!canEdit || busy) return;
    busy = true;

    try {
      onchanged(await api.reports.setSignature(reportId, { fromProfile: true }));
      toast.success('Signature added to this record.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The signature was not saved.');
    } finally {
      busy = false;
    }
  }

  async function remove(): Promise<void> {
    if (!canEdit || busy) return;
    busy = true;

    try {
      onchanged(await api.reports.removeSignature(reportId));
      toast.success('Signature removed from this record.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The signature was not removed.');
    } finally {
      busy = false;
    }
  }
</script>

<div class="signature-card">
  <div class="signature-head">
    <p class="signature-label">Your signature</p>
    <p class="signature-hint">
      Optional. Your saved signature is copied onto the record when you submit. Removing it here
      leaves the record unsigned.
    </p>
  </div>

  {#if signed}
    <SignatureImage {reportId} alt="Your saved signature on this record" />
    {#if canEdit}
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        disabled={busy}
        onclick={() => void remove()}
      >
        <Trash2 size={14} aria-hidden="true" /> Remove signature
      </button>
    {/if}
  {:else if canEdit}
    <button
      class="btn btn-outline btn-sm"
      type="button"
      disabled={busy}
      onclick={() => void useProfile()}
    >
      <PenLine size={14} aria-hidden="true" /> Use my signature on file
    </button>
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

  .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }
</style>

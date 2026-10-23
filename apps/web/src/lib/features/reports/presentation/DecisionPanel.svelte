<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { Check, Undo2 } from '@lucide/svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { invalidateInboxAttention } from '$lib/session/inbox-attention.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  /** One decision, one step (spec §6): approve, or return with comments. */
  let {
    detail,
    ondecided,
  }: {
    detail: ReportDetail;
    ondecided: () => Promise<void>;
  } = $props();

  let returning = $state(false);
  let comments = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);
  let confirmOpen = $state(false);

  async function approve(): Promise<void> {
    if (busy) return;
    busy = true;
    error = null;

    try {
      await api.reports.decide(detail.id, { decision: 'APPROVE' });
      invalidateInboxAttention();
      toast.success('Narrative approved. Acknowledgment receipts are being issued.');
      confirmOpen = false;
      await ondecided();
    } catch (failure) {
      error =
        failure instanceof ApiError ? failure.message : 'The record was not approved. Try again.';
    } finally {
      busy = false;
    }
  }

  async function sendBack(): Promise<void> {
    if (busy) return;
    if (!comments.trim()) {
      error = 'Write what the personnel in charge should change.';
      return;
    }

    busy = true;
    error = null;

    try {
      await api.reports.decide(detail.id, { decision: 'RETURN', comments: comments.trim() });
      invalidateInboxAttention();
      toast.success('Narrative returned for revision.');
      returning = false;
      comments = '';
      await ondecided();
    } catch (failure) {
      error =
        failure instanceof ApiError ? failure.message : 'The record was not returned. Try again.';
    } finally {
      busy = false;
    }
  }
</script>

<section class="decision" aria-labelledby="decision-title">
  <div class="decision-head">
    <h2 id="decision-title">Decision</h2>
    <p class="lede">
      The narrative report is submitted and waiting for the office. Approving issues one
      OVPCASSS-F-013 acknowledgment receipt for each person in charge and mails it to them.
    </p>
  </div>

  {#if error}
    <p class="field-error" role="alert">{error}</p>
  {/if}

  {#if returning}
    <label class="field-label" for="return-comments">What should change?</label>
    <textarea
      id="return-comments"
      class="textarea"
      rows="5"
      maxlength="4000"
      placeholder="Explain what the personnel in charge should revise."
      value={comments}
      oninput={(event) => (comments = event.currentTarget.value)}></textarea>
    <div class="actions">
      <button
        class="btn btn-ghost"
        type="button"
        disabled={busy}
        onclick={() => (returning = false)}
      >
        Cancel
      </button>
      <button class="btn btn-danger" type="button" disabled={busy} onclick={() => void sendBack()}>
        {busy ? 'Returning…' : 'Return for revision'}
      </button>
    </div>
  {:else}
    <div class="actions">
      <button
        class="btn btn-outline"
        type="button"
        disabled={busy}
        onclick={() => (returning = true)}
      >
        <Undo2 size={16} aria-hidden="true" /> Return for revision
      </button>
      <button
        class="btn btn-primary"
        type="button"
        disabled={busy}
        onclick={() => (confirmOpen = true)}
      >
        <Check size={16} aria-hidden="true" /> Approve
      </button>
    </div>
  {/if}
</section>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Approve {detail.referenceNo}?"
  description="The record becomes final. Every person in charge receives their own acknowledgment receipt as a PDF attachment."
  confirmLabel="Approve and issue receipts"
  onconfirm={() => void approve()}
/>

<style>
  .decision {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }

  .decision-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  h2 {
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    max-width: 70ch;
  }

  .field-label {
    font-size: 13px;
    font-weight: 500;
  }

  .field-error {
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }
</style>

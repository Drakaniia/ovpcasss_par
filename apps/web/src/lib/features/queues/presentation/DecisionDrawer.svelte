<script lang="ts">
  import { DECISION_COMMENT_MAX } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';

  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import SideDrawer from '$lib/components/SideDrawer.svelte';

  import type { DecisionController } from '../application/decision-controller.svelte';

  /**
   * The decision drawer (UI spec §7.10): 480 px sheet over the document, one
   * field, the consequence named first. Escape, the overlay, the ×, and Cancel
   * all ask before dropping a written comment.
   */
  let { controller }: { controller: DecisionController } = $props();

  const commentId = $props.id();

  let discardOpen = $state(false);

  const spec = $derived(controller.spec);
  const nearLimit = $derived(controller.note.length >= DECISION_COMMENT_MAX - 200);
  const staleCopy = $derived(
    controller.subject?.kind === 'review'
      ? 'This report is no longer awaiting your review.'
      : 'This report is no longer awaiting your approval.',
  );

  /** The drawer's veto: a written comment is never discarded without asking. */
  function requestClose(): boolean {
    if (controller.busy) return false;
    if (controller.dirty) {
      discardOpen = true;
      return false;
    }

    return true;
  }

  function closeNow() {
    controller.afterClose();
    controller.open = false;
  }

  function cancel() {
    if (requestClose()) closeNow();
  }
</script>

{#if spec}
  <SideDrawer
    bind:open={controller.open}
    title={spec.title}
    subtitle={spec.subtitle}
    beforeClose={requestClose}
    onclose={closeNow}
  >
    {#if controller.stale}
      <div class="form-alert" role="alert">
        <AlertCircle size={16} aria-hidden="true" />
        <div class="form-alert-body">
          <p class="alert-copy">{staleCopy}</p>
          <p class="alert-copy">
            Your comment was kept. Open the current report to see the decision that was recorded.
          </p>
        </div>
      </div>

      <div class="drawer-actions">
        {#if controller.subject}
          <a class="btn btn-outline" href={controller.subject.facsimileHref}
            >Open the current report</a
          >
        {/if}
        <button class="btn btn-ghost" type="button" onclick={() => controller.viewCurrent()}>
          Refresh this page
        </button>
      </div>
    {:else}
      {#if controller.signatureMissing}
        <div class="signature-notice" role="alert">
          <p class="alert-copy">Add your signature before approving.</p>
          <a class="profile-link" href="/profile">Open profile</a>
        </div>
      {/if}

      <p class="consequence">{spec.consequence}</p>

      <div class="field">
        <label class="field-label" for={commentId}>
          <span>{spec.commentLabel}</span>
          {#if spec.commentOptional}
            <span class="field-optional">Optional</span>
          {:else}
            <span class="field-required">Required</span>
          {/if}
        </label>
        <textarea
          class="textarea comment"
          id={commentId}
          bind:value={controller.note}
          aria-invalid={controller.commentError ? 'true' : undefined}
          aria-describedby={controller.commentError ? `${commentId}-error` : undefined}></textarea>
        <p class="field-hint">Visible to the submitter.</p>
        {#if nearLimit}
          <p class="counter">{controller.note.length} / {DECISION_COMMENT_MAX} characters</p>
        {/if}
        {#if controller.commentError}
          <p class="field-error" id="{commentId}-error">
            <AlertCircle size={16} aria-hidden="true" />
            {controller.commentError}
          </p>
        {/if}
      </div>

      {#if spec.notifyOption}
        <label class="checkbox">
          <input type="checkbox" bind:checked={controller.notify} />
          <span>{spec.notifyOption}</span>
        </label>
      {/if}

      {#if controller.failure}
        <div class="form-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <div class="form-alert-body">
            <p class="alert-copy">{controller.failure.message}</p>
            {#if controller.failure.requestId}
              <p class="alert-copy">
                Request ID: <span class="mono">{controller.failure.requestId}</span>
              </p>
            {/if}
          </div>
        </div>
      {/if}

      <div class="drawer-actions">
        <button class="btn btn-outline" type="button" disabled={controller.busy} onclick={cancel}>
          Cancel
        </button>
        <button
          class={spec.tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
          type="button"
          disabled={!controller.canSubmit}
          onclick={() => void controller.submit()}
        >
          {#if controller.busy}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Saving…
          {:else}
            {spec.confirmLabel}
          {/if}
        </button>
      </div>
    {/if}
  </SideDrawer>
{/if}

<ConfirmDialog
  bind:open={discardOpen}
  title="Discard comment?"
  description="The text you wrote will not be saved."
  confirmLabel="Discard comment"
  cancelLabel="Keep writing"
  tone="destructive"
  onconfirm={closeNow}
/>

<style>
  .consequence {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 20px;
  }

  .comment {
    min-height: 160px;
  }

  .counter,
  .field-hint {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .field-required {
    color: var(--text-secondary);
    font-weight: 400;
  }

  .checkbox {
    align-items: center;
    color: var(--text-primary);
    display: flex;
    font-size: 13px;
    gap: 8px;
    margin-top: 16px;
  }

  .signature-notice {
    background: var(--status-gold-bg);
    border: 1px solid var(--brand-gold-600);
    border-radius: var(--radius-card);
    color: var(--status-gold-fg);
    font-size: 13px;
    margin-bottom: 16px;
    padding: 12px 14px;
  }

  .profile-link {
    color: inherit;
    display: inline-block;
    font-weight: 500;
    margin-top: 6px;
    text-decoration: underline;
  }

  .alert-copy {
    margin: 0;
  }

  .alert-copy + .alert-copy {
    margin-top: 6px;
  }

  .mono {
    font-family: var(--font-mono);
  }

  .drawer-actions {
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 16px;
  }

  .form-alert {
    margin-bottom: 16px;
  }
</style>

<script lang="ts">
  import { trapFocus } from '$lib/a11y/focus-trap';
  import { lockScroll, unlockScroll } from '$lib/a11y/scroll-lock';

  import { closeGuard } from '../application/chrome-store.svelte';

  /**
   * The guarded close (desktop window chrome spec §8.6). Cancel is the default
   * focus, the destructive action is text rather than a filled button, and a
   * failed save keeps the window open so the editor can surface its own error.
   */
  const titleId = $props.id();
  const descriptionId = `${titleId}-body`;

  const closeState = closeGuard.state;

  let dialog = $state<HTMLDialogElement | null>(null);
  let cancelButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (closeState.open && !dialog.open) {
      dialog.showModal();
      cancelButton?.focus();
    }
    if (!closeState.open && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!closeState.open) return;
    lockScroll();
    return () => unlockScroll();
  });
</script>

<dialog
  bind:this={dialog}
  class="dialog close-dialog"
  aria-labelledby={titleId}
  aria-describedby={descriptionId}
  oncancel={(event) => {
    // Saving cannot be interrupted; the dialog closes once the save answers.
    event.preventDefault();
    if (!closeState.saving) closeGuard.cancel();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => closeGuard.cancel()}
>
  <h2 id={titleId} class="dialog-title">Save your changes before closing?</h2>

  <p id={descriptionId} class="dialog-body">
    <span class="subject">{closeState.subject}</span> has unsaved changes. Save them before closing the
    window, or discard them.
  </p>

  <div class="dialog-actions">
    <button
      class="text-action"
      type="button"
      disabled={closeState.saving}
      onclick={() => void closeGuard.discardAndClose()}>Discard and close</button
    >
    <span class="spacer"></span>
    <button
      bind:this={cancelButton}
      class="btn btn-outline"
      type="button"
      disabled={closeState.saving}
      onclick={() => closeGuard.cancel()}>Cancel</button
    >
    <button
      class="btn btn-primary"
      type="button"
      aria-busy={closeState.saving}
      disabled={closeState.saving}
      onclick={() => void closeGuard.saveAndClose()}
      >{closeState.saving ? 'Saving…' : 'Save and close'}</button
    >
  </div>
</dialog>

<style>
  .close-dialog {
    max-width: 460px;
    width: min(460px, calc(100vw - 48px));
  }

  .dialog-body {
    line-height: 1.55;
  }

  .subject {
    color: var(--text-primary);
    font-weight: 600;
  }

  /* Discarding is the destructive path, so it stays text: no filled red button. */
  .text-action {
    background: transparent;
    border-radius: 4px;
    color: var(--brand-maroon-800);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 10px;
  }

  .text-action:hover {
    background: var(--brand-maroon-100);
  }

  .text-action:disabled {
    color: var(--text-disabled);
  }

  .dialog-actions {
    align-items: center;
  }

  .spacer {
    flex: 1;
  }
</style>

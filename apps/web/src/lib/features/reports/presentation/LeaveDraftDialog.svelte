<script lang="ts">
  import { trapFocus } from '$lib/a11y/focus-trap';

  /**
   * Leaving with unsaved changes (UI phase 06 §4). Escape and the backdrop both
   * mean Stay, so no keystroke can discard work.
   */
  let {
    open = $bindable(false),
    lost,
    onsave,
    ondiscard,
    onstay,
  }: {
    open?: boolean;
    /** Names what Discard removes: the step and the report, not "your changes". */
    lost: string;
    onsave: () => void;
    ondiscard: () => void;
    onstay: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let stayButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      stayButton?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  function stay(): void {
    open = false;
    onstay();
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    stay();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <h2 id={titleId} class="dialog-title">Leave this report?</h2>
  <p class="dialog-body">
    Your changes have not been saved. Save a draft to continue later. Discard removes {lost} from
    this device; this cannot be undone.
  </p>

  <div class="dialog-actions">
    <button class="btn btn-ghost" type="button" bind:this={stayButton} onclick={stay}>Stay</button>
    <button class="btn btn-ghost discard" type="button" onclick={ondiscard}>Discard</button>
    <button class="btn btn-primary" type="button" onclick={onsave}>Save draft</button>
  </div>
</dialog>

<style>
  .dialog {
    max-width: 460px;
  }

  .dialog-body {
    color: var(--text-secondary);
    margin: 8px 0 0;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .discard {
    color: var(--status-danger-fg);
  }
</style>

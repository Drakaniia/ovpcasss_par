<script lang="ts">
  import { trapFocus } from '$lib/a11y/focus-trap';

  /**
   * A restored draft whose server copy was deleted or has moved on. Never
   * overwrite a returned report: the submitter chooses to keep the local text as
   * a new report or discard it. Escape keeps the draft (the safe choice).
   */
  let {
    open = $bindable(false),
    returned,
    onkeep,
    ondiscard,
  }: {
    open?: boolean;
    returned: boolean;
    onkeep: () => void;
    ondiscard: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let keepButton = $state<HTMLButtonElement | null>(null);

  const title = $derived(
    returned ? 'This report has moved on' : 'This draft is no longer on the server',
  );
  const description = $derived(
    returned
      ? 'The report was returned or otherwise changed while this draft was saved on this device. Keep the local text as a new report, or discard it. The existing report is not changed.'
      : 'The server copy of this draft was removed. Keep the local text as a new report, or discard it.',
  );

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      keepButton?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  function keep(): void {
    open = false;
    onkeep();
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    keep();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <h2 id={titleId} class="dialog-title">{title}</h2>
  <p class="dialog-body">{description}</p>

  <div class="dialog-actions">
    <button class="btn btn-ghost discard" type="button" onclick={ondiscard}>
      Discard local draft
    </button>
    <button class="btn btn-primary" type="button" bind:this={keepButton} onclick={keep}>
      Keep as a new report
    </button>
  </div>
</dialog>

<style>
  .dialog {
    max-width: 480px;
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

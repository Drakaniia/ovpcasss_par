<script lang="ts">
  import { trapFocus } from '$lib/a11y/focus-trap';

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
    onconfirm,
    oncancel,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'destructive';
    onconfirm?: () => void;
    oncancel?: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let cancelButton = $state<HTMLButtonElement | null>(null);
  let confirmButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      (tone === 'destructive' ? cancelButton : confirmButton)?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  function cancel() {
    open = false;
    oncancel?.();
  }

  function confirm() {
    open = false;
    onconfirm?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    cancel();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <h2 id={titleId} class="dialog-title">{title}</h2>
  {#if description}
    <p class="dialog-body">{description}</p>
  {/if}

  <div class="dialog-actions">
    <button class="btn btn-outline" type="button" bind:this={cancelButton} onclick={cancel}>
      {cancelLabel}
    </button>
    <button
      class={tone === 'destructive' ? 'btn btn-danger' : 'btn btn-primary'}
      type="button"
      bind:this={confirmButton}
      onclick={confirm}>{confirmLabel}</button
    >
  </div>
</dialog>

<style>
  .dialog {
    max-height: calc(100vh - 48px);
    overflow: auto;
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
</style>

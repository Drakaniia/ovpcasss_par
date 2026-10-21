<script lang="ts">
  import { AlertCircle, X } from '@lucide/svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';

  let {
    open = $bindable(false),
    termLabel,
    sending = false,
    error = null,
    defaultRecipient,
    onsend,
  }: {
    open?: boolean;
    termLabel: string;
    sending?: boolean;
    error?: string | null;
    defaultRecipient: string;
    onsend: (recipients: string[], note?: string) => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let recipients = $state<string[]>([]);
  let draft = $state('');
  let note = $state('');
  let invalid = $state<string | null>(null);

  // Opened fresh each time: the office address is the only prefill.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      recipients = [defaultRecipient];
      draft = '';
      note = '';
      invalid = null;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  });

  const canAdd = $derived(recipients.length < 5);

  function addRecipient() {
    const value = draft.trim().toLowerCase();
    invalid = null;
    if (!value) return;

    if (recipients.length >= 5) {
      invalid = 'At most five recipients.';
      return;
    }
    if (recipients.includes(value)) {
      invalid = 'That address is already added.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      invalid = 'Enter a complete email address.';
      return;
    }

    recipients = [...recipients, value];
    draft = '';
  }

  function removeRecipient(address: string) {
    recipients = recipients.filter((candidate) => candidate !== address);
  }

  function send() {
    if (recipients.length === 0) {
      invalid = 'Add at least one recipient.';
      return;
    }

    invalid = null;
    onsend(recipients, note.trim() || undefined);
  }

  function close() {
    if (sending) return;
    open = false;
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog send-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <h2 id={titleId} class="dialog-title">Send the workbook by email</h2>
  <p class="dialog-lede">
    The same file as the download, for {termLabel}, is assembled and mailed. Only university
    addresses can receive it.
  </p>

  <div class="field">
    <label class="field-label" for="workbook-recipient">Recipients</label>
    <div class="chip-row">
      {#each recipients as address (address)}
        <span class="recipient-chip">
          {address}
          <button
            class="chip-remove"
            type="button"
            aria-label="Remove {address}"
            disabled={sending}
            onclick={() => removeRecipient(address)}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      {/each}
    </div>
    {#if canAdd}
      <div class="add-row">
        <input
          class="input"
          id="workbook-recipient"
          type="email"
          placeholder="name@buksu.edu.ph"
          autocomplete="email"
          bind:value={draft}
          disabled={sending}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addRecipient();
            }
          }}
        />
        <button
          class="btn btn-outline btn-sm"
          type="button"
          disabled={sending}
          onclick={addRecipient}
        >
          Add
        </button>
      </div>
    {:else}
      <p class="field-hint">Five recipients is the limit for one message.</p>
    {/if}
  </div>

  <div class="field">
    <label class="field-label" for="workbook-note">
      <span>Note</span>
      <span class="field-optional">Optional</span>
    </label>
    <textarea
      class="textarea"
      id="workbook-note"
      rows="3"
      maxlength="500"
      bind:value={note}
      disabled={sending}
      placeholder="For the first semester filing."></textarea>
    <p class="field-hint">{note.length} of 500 characters</p>
  </div>

  {#if invalid || error}
    <p class="form-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      {invalid ?? error}
    </p>
  {/if}

  <div class="dialog-actions">
    <button class="btn btn-outline" type="button" disabled={sending} onclick={close}>Cancel</button>
    <button class="btn btn-primary" type="button" disabled={sending} onclick={send}>
      {sending ? 'Queueing…' : 'Send by email'}
    </button>
  </div>
</dialog>

<style>
  .send-dialog {
    max-width: 520px;
    width: 100%;
  }

  .dialog-lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0 0 16px;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .recipient-chip {
    align-items: center;
    background: var(--brand-navy-100);
    border-radius: var(--radius-badge);
    color: var(--brand-navy-800);
    display: inline-flex;
    font-size: 12px;
    gap: 6px;
    padding: 3px 8px;
  }

  .chip-remove {
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    padding: 0;
  }

  .add-row {
    display: flex;
    gap: 8px;
  }

  .add-row .input {
    flex: 1;
  }
</style>

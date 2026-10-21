<script lang="ts">
  import { Copy } from '@lucide/svelte';

  import { EMAIL_KIND_LABELS, type EmailLogRow, type EmailMessageResponse } from '@par/shared';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { toast } from '$lib/toast/toast.svelte';

  import { linksInText } from '../application/message-links';

  let {
    open = $bindable(false),
    row,
    message,
    loading = false,
    error = null,
    onclose,
    onretry,
  }: {
    open?: boolean;
    row: EmailLogRow | null;
    message: EmailMessageResponse | null;
    loading?: boolean;
    error?: string | null;
    onclose?: () => void;
    onretry?: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);

  /** The link a blocked verification or reset has to travel by hand (§9.4). */
  const links = $derived(message ? linksInText(message.text) : []);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButton?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  async function copy(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Copy is unavailable. Select the link and copy it by hand.');
    }
  }

  function close() {
    open = false;
    onclose?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog message-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <h2 id={titleId} class="dialog-title">Stored message</h2>

  {#if row}
    <p class="meta">{EMAIL_KIND_LABELS[row.kind]} · {row.to}</p>
  {/if}

  {#if loading}
    <p class="state">Reading the stored copy…</p>
  {:else if error}
    <p class="state state-error">{error}</p>
  {:else if message}
    <p class="subject">{message.subject}</p>

    {#if links.length > 0}
      <div class="links">
        <p class="label">Links in this message</p>
        {#each links as link (link)}
          <div class="link-row">
            <code>{link}</code>
            <button
              class="btn btn-outline btn-sm"
              type="button"
              onclick={() => void copy(link)}
              aria-label="Copy link"
            >
              <Copy size={14} aria-hidden="true" /> Copy
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="state">This message carries no link.</p>
    {/if}

    <details class="body">
      <summary>Message text</summary>
      <pre>{message.text}</pre>
    </details>
  {:else}
    <p class="state">No stored copy is open.</p>
  {/if}

  <div class="dialog-actions">
    {#if error && onretry}
      <button class="btn btn-outline" type="button" onclick={onretry}>Try again</button>
    {/if}
    <button class="btn btn-outline" type="button" bind:this={closeButton} onclick={close}
      >Close</button
    >
  </div>
</dialog>

<style>
  .message-dialog {
    max-width: 620px;
  }

  .meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 4px 0 16px;
  }

  .subject {
    font-weight: 600;
    margin: 0 0 12px;
  }

  .label {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.4px;
    margin: 0 0 6px;
    text-transform: uppercase;
  }

  .link-row {
    align-items: flex-start;
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .link-row code {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: 4px;
    flex: 1;
    font-size: 12px;
    overflow-wrap: anywhere;
    padding: 6px 8px;
  }

  .state {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 8px 0;
  }

  .state-error {
    color: var(--status-danger-fg);
  }

  .body {
    margin-top: 12px;
  }

  .body summary {
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
  }

  .body pre {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.5;
    margin: 8px 0 0;
    max-height: 30vh;
    overflow: auto;
    padding: 10px;
    white-space: pre-wrap;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 24px;
  }
</style>

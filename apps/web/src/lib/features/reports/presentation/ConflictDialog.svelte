<script lang="ts">
  import { AlertCircle, Check, LoaderCircle } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';

  import type { ConflictField } from '../application/report-conflict';

  let {
    open,
    title,
    serverLine,
    fields,
    loading = false,
    error,
    oncopy,
    onuseserver,
    onclose,
  }: {
    open: boolean;
    title: string;
    serverLine?: string;
    fields: readonly ConflictField[];
    loading?: boolean;
    error?: string;
    oncopy: () => Promise<void> | void;
    onuseserver: () => void;
    /** Escape closes without a choice; the page keeps the local edits. */
    onclose: () => void;
  } = $props();

  const titleId = $props.id();
  let dialog = $state<HTMLDialogElement | null>(null);
  let copyButton = $state<HTMLButtonElement | null>(null);
  let keepButton = $state<HTMLButtonElement | null>(null);
  let confirming = $state(false);
  let copied = $state(false);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      untrack(() => copyButton?.focus());
    }
    if (!open && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!open) {
      confirming = false;
      copied = false;
    }
  });

  $effect(() => {
    if (confirming) keepButton?.focus();
  });

  async function copyEdits() {
    await oncopy();
    copied = true;
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog conflict-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    onclose();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  {onclose}
>
  <h2 id={titleId} class="dialog-title">{title}</h2>
  <p class="dialog-body">
    {serverLine ?? 'The server has a newer copy of this report.'}
    Your edits are still on this page until you choose.
  </p>

  {#if loading}
    <div class="compare-loading" aria-busy="true">
      <LoaderCircle class="spin" size={16} aria-hidden="true" />
      Loading the server version…
    </div>
  {:else if error}
    <div class="dialog-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{error}</span>
    </div>
  {:else}
    <div class="compare" role="table" aria-label="Changed fields">
      <div class="compare-head" role="row">
        <span role="columnheader">Field</span>
        <span role="columnheader">Server version</span>
        <span role="columnheader">Your edits</span>
      </div>

      {#each fields as field (field.key)}
        <div class="compare-row" role="row">
          <span class="field-name" role="rowheader">{field.label}</span>
          <div class="value" role="cell">{field.serverValue}</div>
          <div class="value" role="cell">{field.localValue}</div>
        </div>
      {/each}
    </div>
  {/if}

  {#if confirming}
    <div class="confirm-block">
      <p class="confirm-copy">
        Discard your local edits and use the server version? Your changes to this report will be
        lost.
      </p>
      <div class="confirm-actions">
        <button
          class="btn btn-outline"
          type="button"
          bind:this={keepButton}
          onclick={() => (confirming = false)}
        >
          Keep editing
        </button>
        <button
          class="btn btn-danger"
          type="button"
          onclick={() => {
            onuseserver();
            onclose();
          }}
        >
          Use server version
        </button>
      </div>
    </div>
  {:else}
    <div class="dialog-actions">
      <button
        class="btn btn-outline"
        type="button"
        bind:this={copyButton}
        disabled={loading || Boolean(error)}
        onclick={() => void copyEdits()}
      >
        {#if copied}
          <Check size={14} aria-hidden="true" />
          Copied
        {:else}
          Copy my edits
        {/if}
      </button>
      <button
        class="btn btn-danger"
        type="button"
        disabled={loading || Boolean(error)}
        onclick={() => (confirming = true)}
      >
        Use server version
      </button>
    </div>
  {/if}
</dialog>

<style>
  .conflict-dialog[open] {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 48px);
    max-width: 880px;
    overflow: hidden;
    width: calc(100vw - 48px);
  }

  .dialog-body {
    color: var(--text-secondary);
    margin: 8px 0 0;
  }

  .compare {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    margin-top: 16px;
    max-height: 52vh;
    overflow-y: auto;
  }

  .compare-head,
  .compare-row {
    display: grid;
    gap: 12px;
    grid-template-columns: 160px minmax(0, 1fr) minmax(0, 1fr);
    padding: 8px 12px;
  }

  .compare-head {
    background: var(--surface-page);
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .compare-row + .compare-row {
    border-top: 1px solid var(--border);
  }

  .field-name {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
  }

  .value {
    font-size: 13px;
    line-height: 1.5;
    max-height: 160px;
    overflow-y: auto;
    overflow-wrap: anywhere;
    white-space: pre-line;
  }

  .compare-row .value:last-child {
    border-left: 2px solid var(--status-danger-bg);
    padding-left: 12px;
  }

  .compare-loading {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 13px;
    gap: 8px;
    padding: 24px 0;
  }

  .dialog-alert {
    align-items: flex-start;
    background: var(--status-danger-bg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    font-size: 13px;
    gap: 8px;
    margin-top: 16px;
    padding: 10px 12px;
  }

  .dialog-actions,
  .confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .confirm-block {
    border-top: 1px solid var(--border);
    margin-top: 20px;
    padding-top: 16px;
  }

  .confirm-copy {
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 0;
  }
</style>

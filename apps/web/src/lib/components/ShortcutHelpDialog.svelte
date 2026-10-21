<script lang="ts">
  import { X } from '@lucide/svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { lockScroll, unlockScroll } from '$lib/a11y/scroll-lock';
  import Kbd from '$lib/components/Kbd.svelte';
  import { shortcutGroups } from '$lib/shortcuts/shortcuts';

  /**
   * Shortcut help (phase 12 §3). Static content from the registry: no loading, no
   * error state, no search. The native modal dialog supplies the top layer, the
   * focus trap, Escape, and focus restore to the trigger.
   */
  let { open = $bindable(false) }: { open?: boolean } = $props();

  const titleId = $props.id();
  const groups = shortcutGroups();

  let dialog = $state<HTMLDialogElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButton?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  });

  function requestClose() {
    open = false;
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog shortcut-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    requestClose();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <header class="shortcut-head">
    <h2 class="dialog-title" id={titleId}>Keyboard shortcuts</h2>
    <button
      bind:this={closeButton}
      class="close"
      type="button"
      aria-label="Close"
      onclick={requestClose}
    >
      <X size={18} aria-hidden="true" />
    </button>
  </header>

  <div class="shortcut-body">
    {#each groups as group, groupIndex (group.title)}
      {@const headingId = `${titleId}-group-${groupIndex}`}
      <section class="group" aria-labelledby={headingId}>
        <h3 class="group-title" id={headingId}>{group.title}</h3>
        {#each group.rows as row (row.label)}
          <div class="row">
            <span class="row-label">{row.label}</span>
            <Kbd combos={row.combos} />
          </div>
        {/each}
      </section>
    {/each}
  </div>

  <p class="note">Shortcuts are disabled while typing.</p>
</dialog>

<style>
  /* `display: flex` must not apply while closed, or it beats the UA `dialog { display: none }`. */
  .shortcut-dialog[open] {
    display: flex;
    flex-direction: column;
    margin: auto;
    max-height: calc(100dvh - 96px);
    max-width: 560px;
    padding: 0;
    width: min(560px, calc(100vw - 48px));
  }

  .shortcut-head {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 16px 20px;
  }

  .shortcut-head h2 {
    margin: 0;
  }

  .close {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 32px;
    justify-content: center;
    transition:
      background-color var(--duration-fast) ease,
      transform 100ms ease-out;
    width: 32px;
  }

  .close:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .close:active {
    transform: scale(0.94);
  }

  /* One scroll region: the head and the note stay put. */
  .shortcut-body {
    flex: 1;
    overflow-y: auto;
    padding: 4px 20px 16px;
  }

  /* Groups are separated by a hairline; rows inside one group are not. A rule
     between every row turns a short list into a table. */
  .group {
    border-top: 1px solid var(--border);
    padding: 14px 0 4px;
  }

  .group:first-child {
    border-top: 0;
  }

  .group-title {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  .row {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    min-height: 34px;
    padding: 3px 0;
  }

  .row-label {
    font-size: 13px;
    text-wrap: pretty;
  }

  .note {
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    padding: 12px 20px;
  }
</style>

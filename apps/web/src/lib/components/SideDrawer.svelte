<script lang="ts">
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  /**
   * Shared right-side drawer (foundation §3.4). A native modal dialog gives the
   * focus trap, Escape handling, inert background, and focus restore for free;
   * motion is the foundation's 120 ms slide and respects reduced motion.
   */
  let {
    open = $bindable(false),
    title,
    subtitle,
    onclose,
    beforeClose,
    children,
  }: {
    open?: boolean;
    title: string;
    subtitle?: string;
    onclose?: () => void;
    /**
     * Veto for a close the user did not mean to confirm; phase 09 uses it to ask
     * before discarding a comment draft. Returning false keeps the drawer open.
     */
    beforeClose?: () => boolean;
    children: Snippet;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  /** Escape, the ×, the overlay, and Cancel all leave through here. */
  function requestClose() {
    if (beforeClose && !beforeClose()) return;
    close();
  }

  function close() {
    open = false;
    onclose?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="side-drawer"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    requestClose();
  }}
  onclick={(event) => {
    // A modal click on the backdrop targets the dialog element itself.
    if (event.target === event.currentTarget) requestClose();
  }}
>
  <header class="drawer-head">
    <div class="drawer-identity">
      <h2 id={titleId}>{title}</h2>
      {#if subtitle}
        <p class="drawer-subtitle">{subtitle}</p>
      {/if}
    </div>
    <button class="drawer-close" type="button" aria-label="Close" onclick={requestClose}>
      <X size={18} aria-hidden="true" />
    </button>
  </header>

  <div class="drawer-body">
    {@render children()}
  </div>
</dialog>

<style>
  .side-drawer {
    background: var(--surface-card);
    border: 0;
    box-shadow: var(--shadow-raised);
    color: var(--text-primary);
    height: 100dvh;
    inset: 0 0 0 auto;
    margin: 0;
    max-height: 100dvh;
    max-width: 480px;
    padding: 0;
    width: min(480px, 100vw);
  }

  .side-drawer[open] {
    animation: drawer-in 140ms cubic-bezier(0.2, 0.8, 0.2, 1);
    display: flex;
    flex-direction: column;
  }

  .drawer-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .drawer-identity {
    min-width: 0;
  }

  .drawer-identity h2 {
    font-size: 18px;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .drawer-subtitle {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }

  .drawer-close {
    align-items: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .drawer-close:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  @keyframes drawer-in {
    from {
      opacity: 0.4;
      transform: translateX(24px);
    }
  }

  @media (max-width: 639px) {
    .side-drawer {
      max-width: 100vw;
    }
  }
</style>

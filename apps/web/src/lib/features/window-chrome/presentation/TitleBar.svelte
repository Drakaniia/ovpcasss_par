<script lang="ts">
  import { Search } from '@lucide/svelte';

  import AvatarMenu from '$lib/components/AvatarMenu.svelte';
  import BrandSeal from '$lib/components/BrandSeal.svelte';
  import NotificationMenu from '$lib/components/NotificationMenu.svelte';
  import { session } from '$lib/session/session.svelte';

  import { chromeMenuInputs } from '../application/chrome-menu.svelte';
  import { chromeState, setFullscreen } from '../application/chrome-store.svelte';
  import { buildMenus } from '../application/menu-model';
  import MenuBar from './MenuBar.svelte';
  import WindowControls from './WindowControls.svelte';

  const menus = $derived(buildMenus(chromeMenuInputs()));
  const user = $derived(session.user);

  let root = $state<HTMLElement | null>(null);
  /** Full screen hides the chrome until the pointer reaches the top edge. */
  let revealed = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const hidden = $derived(chromeState.fullscreen && !revealed);

  function cancelHide(): void {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  }

  function scheduleHide(): void {
    if (!chromeState.fullscreen) return;
    cancelHide();
    hideTimer = setTimeout(() => {
      hideTimer = null;
      // A menu or keyboard focus inside the bar keeps it on screen.
      if (document.querySelector('[data-menu-panel]')) return scheduleHide();
      const active = document.activeElement;
      if (active instanceof Node && root?.contains(active)) return;
      revealed = false;
    }, 1200);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!chromeState.fullscreen) return;
    if (event.clientY > 4) return;
    revealed = true;
    cancelHide();
  }

  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !chromeState.fullscreen) return;
    // A dialog or menu owns Escape first; only an unclaimed Escape leaves full screen.
    if (document.querySelector('dialog[open]')) return;
    void setFullscreen(false);
  }

  function openPalette(): void {
    window.dispatchEvent(new CustomEvent('par:palette'));
  }

  $effect(() => {
    if (!chromeState.fullscreen) {
      revealed = false;
      cancelHide();
    }
  });

  // Bound imperatively: the bar is a container, not an interactive widget, and a
  // role on it would only exist to satisfy the template-handler lint rule.
  $effect(() => {
    const bar = root;
    if (!bar) return;

    const reveal = () => {
      revealed = true;
      cancelHide();
    };

    bar.addEventListener('pointerenter', reveal);
    bar.addEventListener('focusin', reveal);
    bar.addEventListener('pointerleave', scheduleHide);

    return () => {
      bar.removeEventListener('pointerenter', reveal);
      bar.removeEventListener('focusin', reveal);
      bar.removeEventListener('pointerleave', scheduleHide);
    };
  });

  $effect(() => () => cancelHide());
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if hidden}
  <div class="reveal-zone" aria-hidden="true" onpointerenter={onPointerMove}></div>
{/if}

<header class="titlebar" class:is-hidden={hidden} data-chrome bind:this={root}>
  <span class="seal" data-tauri-drag-region aria-hidden="true">
    <BrandSeal size={22} />
  </span>

  <a class="wordmark" href="/">Paperless PAR</a>

  <MenuBar {menus} />

  <div class="spacer" data-tauri-drag-region></div>

  <div class="tools">
    <button class="search" type="button" data-tour="titlebar-search" onclick={openPalette}>
      <Search size={15} aria-hidden="true" />
      <span>Search</span>
    </button>

    {#if user}
      <NotificationMenu />
      <AvatarMenu />
    {/if}
  </div>

  {#if chromeState.controllable}
    <WindowControls />
  {/if}
</header>

<style>
  .titlebar {
    align-items: center;
    background: var(--surface-topbar);
    border-bottom: 1px solid var(--topbar-border);
    color: var(--text-on-topbar);
    display: flex;
    gap: calc(12px * var(--chrome-inverse));
    height: calc(var(--titlebar-height) * var(--chrome-inverse));
    padding-left: calc(12px * var(--chrome-inverse));
    position: sticky;
    top: 0;
    user-select: none;
    z-index: 30;
  }

  .titlebar.is-hidden {
    position: fixed;
    transform: translateY(-100%);
    transition: transform 160ms ease;
    width: 100%;
  }

  .reveal-zone {
    height: 4px;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 31;
  }

  .seal {
    align-items: center;
    color: var(--text-on-topbar);
    display: inline-flex;
    flex: none;
  }

  /* The seal's own spans must not steal the drag hit. */
  .seal :global(*) {
    pointer-events: none;
  }

  .wordmark {
    color: var(--text-on-topbar);
    flex: none;
    font-size: calc(13px * var(--chrome-inverse));
    font-weight: 600;
    letter-spacing: -0.01em;
    margin-right: calc(8px * var(--chrome-inverse));
    white-space: nowrap;
  }

  .wordmark:hover {
    text-decoration: none;
  }

  .spacer {
    flex: 1;
    height: 100%;
    min-width: calc(24px * var(--chrome-inverse));
  }

  .tools {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    gap: calc(8px * var(--chrome-inverse));
    min-width: 0;
  }

  .search {
    align-items: center;
    background: transparent;
    border: 1px solid var(--topbar-border);
    border-radius: var(--radius-card);
    color: var(--text-topbar-muted);
    display: inline-flex;
    flex: 0 1 auto;
    font-size: calc(13px * var(--chrome-inverse));
    gap: calc(8px * var(--chrome-inverse));
    height: calc(28px * var(--chrome-inverse));
    min-width: 0;
    padding: 0 calc(10px * var(--chrome-inverse));
  }

  .search span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search:hover {
    border-color: var(--brand-gold-600);
    color: var(--text-on-topbar);
  }

  .search:focus-visible {
    outline: 2px solid var(--brand-gold-400);
    outline-offset: 2px;
  }
</style>

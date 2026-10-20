<script lang="ts">
  import { page } from '$app/state';
  import { tick } from 'svelte';

  import { commandFor } from '../application/command-registry.svelte';
  import { menuKeyAction, mnemonicIndex, type MenuBarState } from '../application/menu-keyboard';
  import type { ResolvedMenu } from '../application/menu-model';
  import MenuPanel from './MenuPanel.svelte';

  let { menus }: { menus: ResolvedMenu[] } = $props();

  let root = $state<HTMLElement | null>(null);

  let openIndex = $state<number | null>(null);
  let itemIndex = $state(0);
  let barIndex = $state(0);
  let barFocused = $state(false);
  let altHeld = $state(false);
  /** Alt opened a menu, so releasing it must not also focus the bar. */
  let altOpened = false;

  const marksMnemonics = $derived(altHeld || barFocused);

  function triggerAt(index: number): HTMLButtonElement | null {
    return root?.querySelectorAll<HTMLButtonElement>('[data-menu-trigger]')[index] ?? null;
  }

  function itemAt(index: number): HTMLElement | null {
    return root?.querySelector<HTMLElement>(`[data-menu-panel] [data-menu-item="${index}"]`) ?? null;
  }

  function close(restoreFocus: boolean): void {
    const wasOpen = openIndex;
    openIndex = null;
    itemIndex = 0;

    if (restoreFocus && wasOpen !== null) void tick().then(() => triggerAt(wasOpen)?.focus());
  }

  async function open(index: number, focusFirstItem: boolean): Promise<void> {
    openIndex = index;
    barIndex = index;
    itemIndex = 0;

    if (!focusFirstItem) return;
    await tick();
    itemAt(0)?.focus();
  }

  function toggle(index: number): void {
    if (openIndex === index) close(false);
    else void open(index, false);
  }

  /** Hovering another top-level item while a menu is open switches immediately. */
  function hoverTrigger(index: number): void {
    if (openIndex === null || openIndex === index) return;
    openIndex = index;
    itemIndex = 0;
  }

  async function activate(index: number): Promise<void> {
    if (openIndex === null) return;

    const item = menus[openIndex]?.items[index];
    const from = openIndex;

    close(false);
    void tick().then(() => triggerAt(from)?.focus());

    if (!item?.enabled) return;
    await commandFor(item.id)?.run();
  }

  function onPanelHover(index: number): void {
    itemIndex = index;
  }

  function onFocusIn(): void {
    barFocused = true;
  }

  function onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && root?.contains(next)) return;
    barFocused = false;
  }

  async function onBarKeydown(event: KeyboardEvent): Promise<void> {
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      if (openIndex === null) return;
      event.preventDefault();
      close(true);
      return;
    }

    if (openIndex === null && !barFocused) return;

    const state: MenuBarState = { barIndex, openIndex, itemIndex, focusInBar: barFocused };
    const result = menuKeyAction(state, { key: event.key, altKey: event.altKey }, menus);
    if (!result) return;

    event.preventDefault();

    barIndex = result.state.barIndex;
    openIndex = result.state.openIndex;
    itemIndex = result.state.itemIndex;
    barFocused = result.state.focusInBar;

    if (result.kind === 'activate') {
      await activate(result.itemIndex);
      return;
    }

    await tick();
    if (openIndex !== null) itemAt(itemIndex)?.focus();
    else if (barFocused) triggerAt(barIndex)?.focus();
  }

  /** Alt mnemonics work while typing; F10 is the keyboard-only entry. */
  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Alt') {
      altHeld = true;
      altOpened = false;
      return;
    }

    if (event.defaultPrevented || event.isComposing) return;

    if (event.key === 'F10') {
      event.preventDefault();
      close(false);
      barIndex = 0;
      void tick().then(() => triggerAt(0)?.focus());
      return;
    }

    if (!event.altKey || event.key.length !== 1) return;

    const index = mnemonicIndex(
      menus,
      menus.map((menu) => menu.mnemonic),
      event.key,
    );
    if (index === null) return;

    event.preventDefault();
    altOpened = true;
    void open(index, true);
  }

  function onWindowKeyup(event: KeyboardEvent): void {
    if (event.key !== 'Alt') return;

    altHeld = false;

    // Alt alone focuses the menubar, the way a Windows window behaves.
    if (!altOpened && openIndex === null && document.activeElement === document.body) {
      void tick().then(() => triggerAt(0)?.focus());
    }
    altOpened = false;
  }

  function onWindowPointerDown(event: PointerEvent): void {
    if (openIndex === null) return;
    const target = event.target;
    if (target instanceof Node && root?.contains(target)) return;
    close(false);
  }

  // A route change, a window blur or an Escape elsewhere closes the open panel.
  $effect(() => {
    void page.url.pathname;
    close(false);
  });
</script>

<svelte:window
  onkeydown={onWindowKeydown}
  onkeyup={onWindowKeyup}
  onpointerdown={onWindowPointerDown}
  onblur={() => close(false)}
/>

<div
  class="menubar"
  role="menubar"
  aria-label="Application"
  tabindex={-1}
  bind:this={root}
  onkeydown={onBarKeydown}
  onfocusin={onFocusIn}
  onfocusout={onFocusOut}>
  {#each menus as menu, index (menu.id)}
    <div class="menu">
      <button
        class="trigger"
        class:is-open={openIndex === index}
        data-menu-trigger
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={openIndex === index}
        tabindex={openIndex === null ? (barFocused ? (barIndex === index ? 0 : -1) : 0) : -1}
        onclick={() => toggle(index)}
        onmouseenter={() => hoverTrigger(index)}>
        <span class="mnemonic" class:is-marked={marksMnemonics}>{menu.mnemonic}</span
        >{menu.label.slice(1)}
      </button>

      {#if openIndex === index}
        <MenuPanel
          label={menu.label}
          items={menu.items}
          focusedIndex={itemIndex}
          onhover={onPanelHover}
          onactivate={(target) => void activate(target)}
        />
      {/if}
    </div>
  {/each}
</div>

<style>
  .menubar {
    align-items: center;
    display: flex;
    flex: none;
    gap: calc(2px * var(--chrome-inverse));
    height: 100%;
  }

  .menu {
    position: relative;
  }

  .trigger {
    align-items: center;
    background: transparent;
    border-radius: calc(4px * var(--chrome-inverse));
    color: var(--text-topbar-muted);
    display: inline-flex;
    font-size: calc(13px * var(--chrome-inverse));
    height: calc(28px * var(--chrome-inverse));
    padding: 0 calc(10px * var(--chrome-inverse));
    position: relative;
    white-space: nowrap;
  }

  .trigger:hover,
  .trigger.is-open {
    background: var(--topbar-hover);
    color: var(--text-on-topbar);
  }

  /* The only gold in the chrome; it sits on the bar's bottom edge. */
  .trigger.is-open::after {
    background: var(--brand-gold-400);
    bottom: calc(-8px * var(--chrome-inverse));
    content: '';
    height: 2px;
    left: 0;
    position: absolute;
    right: 0;
  }

  .trigger:focus-visible {
    outline: 2px solid var(--brand-gold-400);
    outline-offset: 2px;
  }

  .mnemonic {
    text-decoration-color: transparent;
    text-underline-offset: 0.18em;
  }

  .mnemonic.is-marked {
    text-decoration: underline;
  }
</style>

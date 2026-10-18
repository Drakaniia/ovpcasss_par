<script lang="ts">
  import { MoreHorizontal } from '@lucide/svelte';
  import { tick } from 'svelte';

  import type { ReportRow } from '../application/report-list';

  let {
    row,
    onopen,
    onedit,
    ondelete,
  }: {
    row: ReportRow;
    onopen: () => void;
    onedit: () => void;
    ondelete: () => void;
  } = $props();

  let open = $state(false);
  let root = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  let menu = $state<HTMLDivElement | null>(null);
  let position = $state({ top: 0, left: 0 });
  /** Focusing the first item can scroll its container; that is not a dismiss. */
  let openedAt = 0;

  const menuId = $props.id();
  const deletable = $derived(row.actions.delete.visible);

  function place() {
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth || 190;
    const height = menu.offsetHeight || 96;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top =
      rect.bottom + 4 + height > window.innerHeight - 8
        ? Math.max(8, rect.top - height - 4)
        : rect.bottom + 4;

    position = { top, left };
  }

  async function show() {
    openedAt = performance.now();
    open = true;
    await tick();
    place();
    menu?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }

  function close(restoreFocus: boolean) {
    open = false;
    if (restoreFocus) trigger?.focus();
  }

  function item(action: () => void) {
    close(false);
    action();
  }

  function onMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const items = Array.from(
      menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (items.length === 0) return;

    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const last = items.length - 1;

    if (event.key === 'Home') items[0].focus();
    else if (event.key === 'End') items[last].focus();
    else if (event.key === 'ArrowDown') items[index >= last || index === -1 ? 0 : index + 1].focus();
    else items[index <= 0 ? last : index - 1].focus();
  }

  $effect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (!root?.contains(event.target as Node)) close(false);
    };
    const onScroll = () => {
      if (performance.now() - openedAt < 250) return;
      close(false);
    };

    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  });
</script>

<div class="row-menu" bind:this={root}>
  <button
    class="row-menu-trigger"
    bind:this={trigger}
    type="button"
    aria-label="Actions for {row.title}"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={open ? menuId : undefined}
    onclick={(event) => {
      event.stopPropagation();
      if (open) close(false);
      else void show();
    }}
  >
    <MoreHorizontal size={16} aria-hidden="true" />
  </button>

  {#if open}
    <div
      class="menu"
      id={menuId}
      role="menu"
      tabindex="-1"
      aria-label="Actions for {row.title}"
      bind:this={menu}
      style="top: {position.top}px; left: {position.left}px"
      onkeydown={onMenuKeydown}
    >
      <button
        class="menu-item"
        type="button"
        role="menuitem"
        onclick={(event) => {
          event.stopPropagation();
          item(onopen);
        }}
      >
        Open
      </button>

      {#if row.actions.edit.visible}
        <button
          class="menu-item"
          type="button"
          role="menuitem"
          onclick={(event) => {
            event.stopPropagation();
            item(onedit);
          }}
        >
          Edit
        </button>
      {/if}

      {#if deletable}
        <button
          class="menu-item menu-item-danger"
          type="button"
          role="menuitem"
          disabled={!row.actions.delete.enabled}
          onclick={(event) => {
            event.stopPropagation();
            item(ondelete);
          }}
        >
          Delete draft
        </button>
        {#if row.actions.delete.reason}
          <p class="menu-reason">{row.actions.delete.reason}</p>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .row-menu {
    display: inline-flex;
    justify-content: flex-end;
    width: 100%;
  }

  .row-menu-trigger {
    align-items: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .row-menu-trigger:hover,
  .row-menu-trigger[aria-expanded='true'] {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .menu {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-raised);
    display: flex;
    flex-direction: column;
    min-width: 190px;
    padding: 4px;
    position: fixed;
    z-index: 70;
  }

  .menu-item {
    background: transparent;
    border: 0;
    border-radius: 4px;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    padding: 8px 10px;
    text-align: left;
  }

  .menu-item:hover:not(:disabled) {
    background: var(--primary-subtle);
  }

  .menu-item:disabled {
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .menu-item-danger {
    color: var(--status-danger-fg);
  }

  .menu-reason {
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.4;
    margin: 0;
    padding: 2px 10px 8px;
  }
</style>

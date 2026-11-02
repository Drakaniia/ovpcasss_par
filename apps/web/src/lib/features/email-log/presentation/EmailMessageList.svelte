<script lang="ts">
  import type { EmailKind, EmailTemplateSummary } from '@par/shared';

  import { formatDateTime } from '$lib/format/datetime';

  let {
    items,
    active,
    onselect,
  }: {
    items: readonly EmailTemplateSummary[];
    active: EmailKind;
    onselect: (kind: EmailKind) => void;
  } = $props();

  let root = $state<HTMLUListElement | undefined>();

  /** Arrow keys move between rows, as the list marks the open one with `aria-current`. */
  function move(event: KeyboardEvent, direction: 1 | -1) {
    const buttons = [...(root?.querySelectorAll<HTMLButtonElement>('button[data-kind]') ?? [])];
    const index = buttons.findIndex((button) => button === event.currentTarget);
    const next = buttons[index + direction];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }
</script>

<ul class="message-list" aria-label="Messages" bind:this={root}>
  {#each items as item (item.kind)}
    <li>
      <button
        class="message-row"
        class:is-active={item.kind === active}
        type="button"
        data-kind={item.kind}
        aria-current={item.kind === active ? 'true' : undefined}
        onclick={() => onselect(item.kind)}
        onkeydown={(event) => {
          if (event.key === 'ArrowDown') move(event, 1);
          if (event.key === 'ArrowUp') move(event, -1);
        }}
      >
        <span class="row-head">
          <span class="row-name">{item.label}</span>
          <span class="row-chip" class:is-edited={item.edited}>
            {item.edited ? 'Edited' : 'Default'}
          </span>
        </span>
        <span class="row-audience">{item.audience}</span>
        {#if item.edited && item.updatedAt}
          <span class="row-meta">
            Edited {formatDateTime(item.updatedAt)} by {item.updatedByName ?? 'an administrator'}
          </span>
        {/if}
        {#if item.unreadable}
          <span class="row-warning">The stored copy could not be read</span>
        {/if}
      </button>
    </li>
  {/each}
</ul>

<style>
  .message-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .message-row {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-card);
    color: inherit;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    text-align: left;
    width: 100%;
  }

  .message-row:hover {
    background: var(--surface-paper);
  }

  .message-row.is-active {
    background: var(--primary-subtle);
    border-color: var(--brand-navy-800);
  }

  .row-head {
    align-items: center;
    display: flex;
    gap: 6px;
    justify-content: space-between;
  }

  .row-name {
    font-size: 13px;
    font-weight: 600;
  }

  .row-chip {
    background: var(--status-neutral-bg);
    border-radius: 999px;
    color: var(--status-neutral-fg);
    flex: none;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 7px;
  }

  .row-chip.is-edited {
    background: var(--status-gold-bg);
    color: var(--status-gold-fg);
  }

  .row-audience {
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.35;
  }

  .row-meta {
    color: var(--text-secondary);
    font-size: 10px;
  }

  .row-warning {
    color: var(--status-danger-fg);
    font-size: 10px;
  }
</style>

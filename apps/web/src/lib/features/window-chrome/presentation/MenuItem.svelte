<script lang="ts">
  import { ariaKeyshortcutsFor, type ResolvedMenuItem } from '../application/menu-model';

  let {
    item,
    index,
    focused,
    onhover,
    onactivate,
  }: {
    item: ResolvedMenuItem;
    index: number;
    focused: boolean;
    onhover: (index: number) => void;
    onactivate: (index: number) => void;
  } = $props();

  const reasonId = $props.id();
</script>

<button
  class="row"
  class:is-focused={focused}
  data-menu-item={index}
  type="button"
  role={item.checkable ? 'menuitemcheckbox' : 'menuitem'}
  tabindex={focused ? 0 : -1}
  aria-disabled={item.enabled ? undefined : 'true'}
  aria-checked={item.checkable ? item.checked : undefined}
  aria-keyshortcuts={item.accelerator ? ariaKeyshortcutsFor(item.accelerator) : undefined}
  aria-describedby={item.reason ? reasonId : undefined}
  onmouseenter={() => onhover(index)}
  onclick={() => onactivate(index)}
>
  {#if item.checkable}
    <span class="check" aria-hidden="true">{item.checked ? '✓' : ''}</span>
  {/if}
  <span class="label">{item.label}</span>
  {#if item.accelerator}
    <span class="accelerator" aria-hidden="true">{item.accelerator}</span>
  {/if}
  {#if item.reason}
    <span class="sr-only" id={reasonId}>{item.reason}</span>
  {/if}
</button>

<style>
  .row {
    align-items: center;
    background: transparent;
    border-radius: calc(4px * var(--chrome-inverse));
    color: var(--text-primary);
    display: flex;
    font-size: calc(13px * var(--chrome-inverse));
    gap: calc(10px * var(--chrome-inverse));
    min-height: calc(32px * var(--chrome-inverse));
    padding: 0 calc(12px * var(--chrome-inverse));
    text-align: left;
    width: 100%;
  }

  .row:hover,
  .row.is-focused {
    background: var(--surface-page);
  }

  .row[aria-disabled='true'] {
    opacity: 0.5;
  }

  .row[aria-disabled='true']:hover {
    background: transparent;
  }

  .check {
    color: var(--brand-navy-800);
    display: inline-block;
    font-size: calc(11px * var(--chrome-inverse));
    width: calc(16px * var(--chrome-inverse));
  }

  .label {
    flex: 1;
    min-width: 0;
  }

  .accelerator {
    color: var(--text-secondary);
    flex: none;
    font-size: calc(12px * var(--chrome-inverse));
    margin-left: calc(16px * var(--chrome-inverse));
    white-space: nowrap;
  }
</style>

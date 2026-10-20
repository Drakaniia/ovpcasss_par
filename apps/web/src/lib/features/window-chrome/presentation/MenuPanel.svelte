<script lang="ts">
  import MenuItem from './MenuItem.svelte';
  import type { ResolvedMenuItem } from '../application/menu-model';

  let {
    label,
    items,
    focusedIndex,
    onhover,
    onactivate,
  }: {
    label: string;
    items: ResolvedMenuItem[];
    focusedIndex: number;
    onhover: (index: number) => void;
    onactivate: (index: number) => void;
  } = $props();
</script>

<div class="panel" role="menu" aria-label={label} data-menu-panel>
  {#each items as item, index (item.id)}
    {#if item.separatorBefore && index > 0}
      <span class="separator" role="separator"></span>
    {/if}
    <MenuItem {item} {index} focused={index === focusedIndex} {onhover} {onactivate} />
  {/each}
</div>

<style>
  .panel {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: calc(8px * var(--chrome-inverse));
    box-shadow: var(--shadow-raised);
    display: flex;
    flex-direction: column;
    left: 0;
    margin-top: calc(4px * var(--chrome-inverse));
    max-height: calc(100vh - 56px);
    min-width: var(--menu-panel-width);
    overflow-y: auto;
    padding: calc(4px * var(--chrome-inverse));
    position: absolute;
    top: 100%;
    z-index: 60;
  }

  .separator {
    background: var(--border);
    height: 1px;
    margin: calc(6px * var(--chrome-inverse)) calc(8px * var(--chrome-inverse));
  }

  @media (prefers-reduced-motion: no-preference) {
    .panel {
      animation: settle 120ms ease-out;
    }

    @keyframes settle {
      from {
        opacity: 0;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  }
</style>

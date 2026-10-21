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
    background: rgb(255 255 255 / 92%);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid var(--border);
    border-radius: calc(10px * var(--chrome-inverse));
    box-shadow:
      var(--shadow-raised),
      inset 0 1px 0 rgb(255 255 255 / 70%);
    display: flex;
    flex-direction: column;
    left: 0;
    margin-top: calc(4px * var(--chrome-inverse));
    max-height: calc(100vh - 56px);
    min-width: var(--menu-panel-width);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: calc(4px * var(--chrome-inverse));
    position: absolute;
    top: 100%;
    transform-origin: top left;
    z-index: 60;
  }

  .separator {
    background: var(--border);
    height: 1px;
    margin: calc(6px * var(--chrome-inverse)) calc(8px * var(--chrome-inverse));
  }

  @media (prefers-reduced-transparency: reduce) {
    .panel {
      background: var(--surface-card);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .panel {
      /* Materializes from its trigger: anchored origin, short settle. */
      animation: settle 160ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    @keyframes settle {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  }
</style>

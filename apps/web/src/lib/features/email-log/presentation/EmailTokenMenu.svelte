<script lang="ts">
  import type { EmailTokenOption } from '@par/shared';

  import { tokenExample } from '../application/email-template-draft';

  let {
    tokens,
    label = 'Insert value',
    oninsert,
  }: {
    tokens: readonly EmailTokenOption[];
    label?: string;
    oninsert: (token: string) => void;
  } = $props();

  let open = $state(false);
  let root = $state<HTMLDivElement | undefined>();

  function choose(token: string) {
    open = false;
    oninsert(token);
  }
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }}
/>

<div class="token-menu" bind:this={root}>
  <button
    class="btn btn-ghost btn-sm token-trigger"
    type="button"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    {label}
  </button>

  {#if open}
    <ul class="token-list" role="menu" aria-label={label}>
      {#each tokens as option (option.token)}
        <li role="none">
          <button
            class="token-option"
            type="button"
            role="menuitem"
            onclick={() => choose(option.token)}
          >
            <span class="token-label">{option.label}</span>
            <span class="token-example"> — {tokenExample(option.example)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .token-menu {
    position: relative;
  }

  .token-trigger {
    font-size: 12px;
    padding: 2px 6px;
  }

  .token-list {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: 0 8px 24px rgb(17 24 39 / 12%);
    list-style: none;
    margin: 4px 0 0;
    max-height: 260px;
    max-width: 320px;
    min-width: 240px;
    overflow: auto;
    padding: 4px;
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 20;
  }

  .token-option {
    background: none;
    border: 0;
    border-radius: 4px;
    color: var(--text-primary);
    cursor: pointer;
    display: block;
    font-size: 12px;
    padding: 6px 8px;
    text-align: left;
    width: 100%;
  }

  .token-option:hover,
  .token-option:focus-visible {
    background: var(--primary-subtle);
  }

  .token-label {
    font-weight: 500;
  }

  .token-example {
    color: var(--text-secondary);
  }
</style>

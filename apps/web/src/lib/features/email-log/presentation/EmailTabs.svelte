<script lang="ts">
  import TabIndicator from '$lib/components/TabIndicator.svelte';

  import { EMAIL_TABS, type EmailTab } from '../application/email-tabs';

  let { active }: { active: EmailTab } = $props();

  let tabRow: HTMLElement | undefined = $state();
</script>

<nav class="email-tabs" aria-label="Email" bind:this={tabRow}>
  {#each EMAIL_TABS as tab (tab.key)}
    <a
      class="email-tab"
      data-tab-key={tab.key}
      class:is-active={tab.key === active}
      href={tab.href}
      aria-current={tab.key === active ? 'page' : undefined}
    >
      {tab.label}
    </a>
  {/each}
  <TabIndicator row={tabRow} {active} />
</nav>

<style>
  .email-tabs {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    gap: 2px;
    margin-bottom: 20px;
    overflow-x: auto;
    padding: 4px;
    position: relative;
  }

  .email-tab {
    border-bottom: 2px solid transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    flex: none;
    font-size: 13px;
    padding: 7px 12px;
    transition:
      background-color var(--duration-fast) var(--ease-standard),
      color var(--duration-fast) var(--ease-standard);
    white-space: nowrap;
  }

  .email-tab:hover {
    background: var(--surface-page);
    color: var(--text-primary);
    text-decoration: none;
  }

  .email-tab.is-active {
    color: var(--primary);
    font-weight: 500;
  }
</style>

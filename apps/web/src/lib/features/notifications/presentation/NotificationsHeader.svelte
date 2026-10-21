<script lang="ts">
  import type { NotificationFilter } from '@par/shared';

  import TabIndicator from '$lib/components/TabIndicator.svelte';

  import { notificationFilterTabs } from '../application/notification-view';

  /** Page header and filter row (phase 11 §2). No filled primary action here. */
  let {
    filter,
    unreadCount,
    markingAll,
    onmarkall,
  }: {
    filter: NotificationFilter;
    unreadCount: number;
    markingAll: boolean;
    onmarkall: () => void;
  } = $props();

  const tabs = notificationFilterTabs();

  let filterRow: HTMLElement | undefined = $state();
</script>

<header class="page-header">
  <div class="heading">
    <h1>Notifications</h1>
    <p class="subtitle">Activity on your reports and on your account.</p>
  </div>

  {#if unreadCount > 0}
    <button class="mark-all" type="button" disabled={markingAll} onclick={onmarkall}>
      {markingAll ? 'Marking all…' : 'Mark all read'}
    </button>
  {/if}
</header>

<nav class="filters" aria-label="Notification filters" bind:this={filterRow}>
  {#each tabs as tab (tab.filter)}
    <a
      class="filter"
      data-tab-key={tab.filter}
      class:is-active={tab.filter === filter}
      href={tab.href}
      aria-current={tab.filter === filter ? 'page' : undefined}>{tab.label}</a
    >
  {/each}
  <TabIndicator row={filterRow} active={filter} />
</nav>

<style>
  .page-header {
    align-items: start;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .heading h1 {
    margin: 0;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 2px 0 0;
  }

  .mark-all {
    background: transparent;
    border: 0;
    color: var(--link);
    font-size: 13px;
    font-weight: 500;
    height: 32px;
    padding: 0 4px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .mark-all:disabled {
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .filters {
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    position: relative;
  }

  .filter {
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 8px 12px;
    transition:
      background-color var(--duration-fast) var(--ease-standard),
      color var(--duration-fast) var(--ease-standard);
  }

  .filter:hover {
    background: var(--surface-card);
    color: var(--text-primary);
    text-decoration: none;
  }

  .filter.is-active {
    color: var(--primary);
    font-weight: 600;
  }
</style>

<script lang="ts">
  import type { ReferenceEntityKey } from '@par/shared';

  import TabIndicator from '$lib/components/TabIndicator.svelte';

  import {
    REFERENCE_ENTITY_CONFIGS,
    REFERENCE_ENTITY_ORDER,
  } from '../application/reference-entities';
  import { paramsForView } from '../application/reference-data';

  let {
    entity,
    showInactive,
  }: {
    entity: ReferenceEntityKey;
    showInactive: boolean;
  } = $props();

  let entityRow: HTMLElement | undefined = $state();

  const hrefFor = (key: ReferenceEntityKey): string => {
    const params = paramsForView(key, showInactive);
    return `/admin/reference-data${params ? `?${params}` : ''}`;
  };
</script>

<nav class="entity-tabs" aria-label="Reference data entities" bind:this={entityRow}>
  {#each REFERENCE_ENTITY_ORDER as key (key)}
    <a
      class="entity-tab"
      data-tab-key={key}
      class:is-active={key === entity}
      href={hrefFor(key)}
      aria-current={key === entity ? 'page' : undefined}
    >
      {REFERENCE_ENTITY_CONFIGS[key].label}
    </a>
  {/each}
  <TabIndicator row={entityRow} active={entity} />
</nav>

<style>
  .entity-tabs {
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

  .entity-tab {
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

  .entity-tab:hover {
    background: var(--surface-page);
    color: var(--text-primary);
    text-decoration: none;
  }

  .entity-tab.is-active {
    color: var(--primary);
    font-weight: 500;
  }
</style>

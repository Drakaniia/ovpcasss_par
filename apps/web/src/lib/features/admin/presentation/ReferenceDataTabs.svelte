<script lang="ts">
  import type { ReferenceEntityKey } from '@par/shared';

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

  const hrefFor = (key: ReferenceEntityKey): string => {
    const params = paramsForView(key, showInactive);
    return `/admin/reference-data${params ? `?${params}` : ''}`;
  };
</script>

<nav class="entity-tabs" aria-label="Reference data entities">
  {#each REFERENCE_ENTITY_ORDER as key (key)}
    <a
      class="entity-tab"
      class:is-active={key === entity}
      href={hrefFor(key)}
      aria-current={key === entity ? 'page' : undefined}
    >
      {REFERENCE_ENTITY_CONFIGS[key].label}
    </a>
  {/each}
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
    scrollbar-width: thin;
  }

  .entity-tab {
    border-bottom: 2px solid transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    flex: none;
    font-size: 13px;
    padding: 7px 12px;
    white-space: nowrap;
  }

  .entity-tab:hover {
    background: var(--surface-page);
    color: var(--text-primary);
    text-decoration: none;
  }

  .entity-tab.is-active {
    border-bottom-color: var(--primary);
    color: var(--primary);
    font-weight: 500;
  }
</style>

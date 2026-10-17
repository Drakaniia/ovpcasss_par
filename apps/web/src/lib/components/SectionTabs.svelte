<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { page } from '$app/state';

  import { activeNavId, isTabActive, sectionTabsFor } from '$lib/navigation/navigation';
  import { session } from '$lib/session/session.svelte';

  const section = $derived(activeNavId(page.url.pathname));
  const role = $derived(session.user?.role ?? null);
  const tabs = $derived(sectionTabsFor(section, role));
</script>

{#if tabs.length > 1}
  <div class="tab-row">
    <div class="tab-inner">
      <nav class="tabs" aria-label="Section">
        {#each tabs as tab (tab.href)}
          <a
            class="tab"
            class:is-active={isTabActive(tab.href, page.url.pathname, page.url.search)}
            href={tab.href}
            aria-current={isTabActive(tab.href, page.url.pathname, page.url.search)
              ? 'page'
              : undefined}>{tab.label}</a
          >
        {/each}
      </nav>

      {#if section === 'reports' && role === 'SUBMITTER'}
        <a class="btn btn-primary btn-sm" href="/reports/new">
          <Plus size={14} aria-hidden="true" />
          New report
        </a>
      {/if}
    </div>
  </div>
{/if}

<style>
  .tab-row {
    background: var(--surface-card);
    box-shadow: inset 0 -1px 0 var(--border);
    height: 40px;
  }

  .tab-inner {
    align-items: center;
    display: flex;
    gap: 16px;
    height: 100%;
    margin-inline: auto;
    max-width: 1440px;
    padding-inline: 24px;
  }

  .tabs {
    align-self: stretch;
    display: flex;
    gap: 4px;
  }

  .tab {
    align-items: center;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 13px;
    padding: 0 12px;
  }

  .tab:hover {
    background: var(--surface-page);
    color: var(--text-primary);
    text-decoration: none;
  }

  .tab.is-active {
    border-bottom-color: var(--brand-navy-800);
    color: var(--brand-navy-800);
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .tab.is-active {
      border-bottom-color: var(--primary);
      color: var(--primary);
    }
  }
</style>

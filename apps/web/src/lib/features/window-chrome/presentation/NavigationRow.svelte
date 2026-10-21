<script lang="ts">
  import { page } from '$app/state';

  import TabIndicator from '$lib/components/TabIndicator.svelte';
  import {
    activeNavId,
    isTabActive,
    navItemsFor,
    sectionTabsFor,
    tabHref,
  } from '$lib/navigation/navigation';
  import { session } from '$lib/session/session.svelte';

  /**
   * The second chrome row (desktop window chrome spec §5.1, §6.3): primary
   * navigation on the left, the section's tabs on the right. It is the one row
   * that keeps navigation reachable on every shell page, including the wizard,
   * which is why it renders even when a section has no tabs.
   */
  const role = $derived(session.user?.role ?? null);
  const section = $derived(activeNavId(page.url.pathname));
  const navItems = $derived(navItemsFor(role));
  const tabs = $derived(sectionTabsFor(section, role));
  /** The new-report wizard keeps primary nav and drops only the section tabs (D25). */
  const isWizard = $derived(page.url.pathname === '/reports/new');
  const showTabs = $derived(!isWizard && tabs.length > 1);

  const activeTabHref = $derived(
    tabs.find((tab) => isTabActive(tab.href, page.url.pathname, page.url.search))?.href ?? null,
  );

  let sectionRow: HTMLElement | undefined = $state();
</script>

{#if navItems.length > 0}
  <div class="nav-row">
    <div class="nav-inner">
      <nav class="primary" aria-label="Primary" data-tour="primary-nav">
        {#each navItems as item (item.id)}
          <a
            class="nav-link"
            data-tour="nav-{item.id}"
            class:is-active={section === item.id}
            href={item.href}
            aria-current={section === item.id ? 'page' : undefined}>{item.label}</a
          >
        {/each}
      </nav>

      {#if showTabs}
        <nav class="sections" aria-label="Section" bind:this={sectionRow}>
          {#each tabs as tab (tab.href)}
            {@const active = isTabActive(tab.href, page.url.pathname, page.url.search)}
            <a
              class="tab"
              data-tab-key={tab.href}
              class:is-active={active}
              href={tabHref(tab.href, page.url.search)}
              aria-current={active ? 'page' : undefined}>{tab.label}</a
            >
          {/each}
          <TabIndicator row={sectionRow} active={activeTabHref} />
        </nav>
      {/if}
    </div>
  </div>
{/if}

<style>
  .nav-row {
    background: var(--surface-card);
    box-shadow: inset 0 -1px 0 var(--border);
    height: calc(40px * var(--chrome-inverse));
    position: sticky;
    /* Stops under the sticky titlebar, not under the viewport edge. */
    top: calc(var(--titlebar-height) * var(--chrome-inverse));
    z-index: 20;
  }

  .nav-inner {
    align-items: center;
    display: flex;
    gap: calc(24px * var(--chrome-inverse));
    height: 100%;
    margin-inline: auto;
    max-width: 1440px;
    padding-inline: 24px;
  }

  /* Primary nav never scrolls: the section tabs give way first. */
  .primary {
    align-self: stretch;
    display: flex;
    flex: none;
    gap: calc(4px * var(--chrome-inverse));
  }

  .nav-link {
    align-items: center;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: calc(14px * var(--chrome-inverse));
    padding: 0 calc(10px * var(--chrome-inverse));
  }

  .nav-link:hover {
    background: var(--surface-page);
    color: var(--text-primary);
    text-decoration: none;
  }

  .nav-link.is-active {
    border-bottom-color: var(--brand-navy-800);
    color: var(--text-primary);
    font-weight: 500;
  }

  .sections {
    align-self: stretch;
    display: flex;
    gap: calc(4px * var(--chrome-inverse));
    margin-left: auto;
    overflow-x: auto;
    position: relative;
    scrollbar-width: none;
  }

  .sections::-webkit-scrollbar {
    display: none;
  }

  .tab {
    align-items: center;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    font-size: calc(13px * var(--chrome-inverse));
    padding: 0 calc(12px * var(--chrome-inverse));
    transition:
      background-color var(--duration-fast) var(--ease-standard),
      color var(--duration-fast) var(--ease-standard);
  }

  .tab:hover {
    background: var(--surface-page);
    color: var(--text-primary);
    text-decoration: none;
  }

  .tab.is-active {
    color: var(--brand-navy-800);
    font-weight: 500;
  }
</style>

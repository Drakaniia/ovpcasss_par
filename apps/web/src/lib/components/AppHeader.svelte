<script lang="ts">
  import { ChevronDown, Bell, Search } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  import BrandSeal from '$lib/components/BrandSeal.svelte';
  import {
    ROLE_LABELS,
    activeNavId,
    canSearchRepository,
    navItemsFor,
  } from '$lib/navigation/navigation';
  import { initialsFor, session, signOut } from '$lib/session/session.svelte';
  import { focusSearchField } from '$lib/shortcuts/keyboard';

  const user = $derived(session.user);
  const role = $derived(user?.role ?? null);
  const navItems = $derived(navItemsFor(role));
  const active = $derived(activeNavId(page.url.pathname));
  const unread = $derived(user?.unreadNotifications ?? 0);
  const canSearch = $derived(canSearchRepository(role));

  let menu = $state<HTMLDetailsElement | null>(null);

  function openSearch() {
    if (!focusSearchField() && canSearch) void goto('/search');
  }

  function closeMenu() {
    if (menu) menu.open = false;
  }

  function openShortcuts() {
    closeMenu();
    window.dispatchEvent(new CustomEvent('par:shortcuts'));
  }

  async function signOutAccount() {
    closeMenu();
    await signOut();
    void goto('/login');
  }

  function closeOnOutsideClick(event: MouseEvent) {
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  }
</script>

<svelte:window onclick={closeOnOutsideClick} />

<header class="app-header">
  <div class="bar">
    <a class="brand-link" href="/" aria-label="OVPCASSS Paperless PAR, home">
      <BrandSeal size={28} wordmark />
    </a>

    {#if navItems.length > 0}
      <nav class="nav" aria-label="Primary">
        {#each navItems as item (item.id)}
          <a
            class="nav-link"
            class:is-active={active === item.id}
            href={item.href}
            aria-current={active === item.id ? 'page' : undefined}>{item.label}</a
          >
        {/each}
      </nav>
    {/if}

    <div class="tools">
      {#if canSearch}
        <button class="search" type="button" onclick={openSearch}>
          <Search size={16} aria-hidden="true" />
          <span>Search</span>
          <kbd class="kbd search-key">/</kbd>
        </button>
      {/if}

      {#if user}
        <a
          class="icon-button"
          href="/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell size={18} aria-hidden="true" />
          {#if unread > 0}
            <span class="count">{unread > 9 ? '9+' : unread}</span>
          {/if}
        </a>

        <details bind:this={menu} class="avatar-menu">
          <summary class="avatar-trigger" aria-label="Account menu for {user.fullName}">
            <span class="avatar" aria-hidden="true">{initialsFor(user.fullName)}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>

          <div class="menu-panel">
            <div class="identity">
              <p class="identity-name">{user.fullName}</p>
              <p class="identity-role">
                {user.role ? ROLE_LABELS[user.role] : 'Role not yet assigned'}
              </p>
            </div>
            <a class="menu-item" href="/profile" onclick={closeMenu}>Profile</a>
            <button class="menu-item" type="button" onclick={openShortcuts}>
              Keyboard shortcuts
            </button>
            <button class="menu-item menu-item-end" type="button" onclick={signOutAccount}>
              Sign out
            </button>
          </div>
        </details>
      {/if}
    </div>
  </div>
</header>

<style>
  .app-header {
    background: var(--surface-topbar);
    color: var(--text-on-topbar);
  }

  .bar {
    align-items: center;
    display: flex;
    gap: 24px;
    height: 56px;
    margin-inline: auto;
    max-width: 1440px;
    padding-inline: 24px;
  }

  .brand-link {
    align-items: center;
    color: var(--text-on-topbar);
    display: inline-flex;
    flex: none;
  }

  .brand-link:hover {
    text-decoration: none;
  }

  .nav {
    align-items: stretch;
    align-self: stretch;
    display: flex;
    gap: 4px;
  }

  .nav-link {
    align-items: center;
    border-bottom: 2px solid transparent;
    color: var(--text-topbar-muted);
    display: inline-flex;
    font-size: 14px;
    padding: 0 12px;
  }

  .nav-link:hover {
    background: var(--topbar-hover);
    color: var(--text-on-topbar);
    text-decoration: none;
  }

  .nav-link.is-active {
    border-bottom-color: var(--brand-gold-400);
    color: var(--text-on-topbar);
    font-weight: 500;
  }

  .tools {
    align-items: center;
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .search {
    align-items: center;
    background: transparent;
    border: 1px solid var(--topbar-border);
    border-radius: var(--radius-card);
    color: var(--text-topbar-muted);
    display: inline-flex;
    font-size: 13px;
    gap: 8px;
    height: 32px;
    padding: 0 10px;
  }

  .search:hover {
    border-color: var(--brand-gold-600);
    color: var(--text-on-topbar);
  }

  .search-key {
    background: var(--topbar-hover);
    border-color: var(--topbar-border);
    color: var(--text-topbar-muted);
  }

  .icon-button {
    align-items: center;
    border-radius: var(--radius-card);
    color: var(--text-topbar-muted);
    display: inline-flex;
    height: 32px;
    justify-content: center;
    position: relative;
    width: 32px;
  }

  .icon-button:hover {
    background: var(--topbar-hover);
    color: var(--text-on-topbar);
    text-decoration: none;
  }

  .count {
    background: var(--brand-gold-400);
    border-radius: 999px;
    color: var(--brand-navy-900);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    min-width: 16px;
    padding: 3px 4px;
    position: absolute;
    right: 0;
    text-align: center;
    top: 0;
  }

  .avatar-menu {
    position: relative;
  }

  .avatar-trigger {
    align-items: center;
    border-radius: var(--radius-card);
    color: var(--text-topbar-muted);
    cursor: pointer;
    display: inline-flex;
    gap: 6px;
    height: 32px;
    list-style: none;
    padding: 0 4px;
  }

  .avatar-trigger::-webkit-details-marker {
    display: none;
  }

  .avatar-trigger:hover {
    background: var(--topbar-hover);
    color: var(--text-on-topbar);
  }

  .avatar {
    align-items: center;
    background: var(--brand-navy-700);
    border: 1px solid var(--topbar-border);
    border-radius: 50%;
    color: var(--text-on-topbar);
    display: inline-flex;
    font-size: 11px;
    font-weight: 600;
    height: 26px;
    justify-content: center;
    width: 26px;
  }

  .menu-panel {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-raised);
    color: var(--text-primary);
    min-width: 220px;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 40;
  }

  .identity {
    border-bottom: 1px solid var(--border);
    padding: 12px;
  }

  .identity-name {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
  }

  .identity-role {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .menu-item {
    background: transparent;
    color: var(--text-primary);
    display: block;
    font-size: 13px;
    padding: 8px 12px;
    text-align: left;
    width: 100%;
  }

  .menu-item:hover {
    background: var(--surface-page);
    text-decoration: none;
  }

  .menu-item-end {
    border-top: 1px solid var(--border);
  }
</style>

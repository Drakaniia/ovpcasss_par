<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';

  import { commandFor } from '$lib/features/window-chrome/application/command-registry.svelte';
  import { closeGuard } from '$lib/features/window-chrome/application/chrome-store.svelte';
  import { ROLE_LABELS } from '$lib/navigation/navigation';
  import { initialsFor, session } from '$lib/session/session.svelte';

  /**
   * The account menu in the titlebar tools zone (desktop window chrome spec
   * §5.2). Sign out runs the shell command so the menu, the keyboard and this
   * list cannot disagree, and it is disabled while an editor has unsaved work.
   */
  const user = $derived(session.user);
  const signOutCommand = $derived(commandFor('file.sign-out'));
  const dirty = $derived(closeGuard.dirtyGuard() !== null);

  const signOutEnabled = $derived(Boolean(user) && !dirty);

  const signOutReason = $derived(
    dirty ? 'Save or discard your draft first.' : 'You are not signed in.',
  );

  let menu = $state<HTMLDetailsElement | null>(null);

  function closeMenu() {
    if (menu) menu.open = false;
  }

  function openShortcuts() {
    // Keep focus on the trigger so the dialog returns it here when it closes.
    menu?.querySelector('summary')?.focus();
    closeMenu();
    window.dispatchEvent(new CustomEvent('par:shortcuts'));
  }

  function signOutAccount() {
    if (!signOutEnabled) return;
    closeMenu();
    void signOutCommand?.run();
  }

  function closeOnOutsideClick(event: MouseEvent) {
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  }
</script>

<svelte:window onclick={closeOnOutsideClick} />

{#if user}
  <details bind:this={menu} class="avatar-menu">
    <summary
      class="avatar-trigger"
      data-tour="account-menu"
      aria-label="Account menu for {user.fullName}"
    >
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
      <a class="menu-item" href="/how-it-works" onclick={closeMenu}>How the report works</a>
      <button class="menu-item" type="button" onclick={openShortcuts}>Keyboard shortcuts</button>

      <div class="menu-end">
        <button
          class="menu-item"
          type="button"
          aria-disabled={!signOutEnabled}
          title={signOutEnabled ? undefined : signOutReason}
          onclick={signOutAccount}>Sign out</button
        >
        {#if !signOutEnabled}
          <span class="visually-hidden">{signOutReason}</span>
        {/if}
      </div>
    </div>
  </details>
{/if}

<style>
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
    height: calc(32px * var(--chrome-inverse));
    list-style: none;
    padding: 0 4px;
  }

  .avatar-trigger::-webkit-details-marker {
    display: none;
  }

  .avatar-trigger:hover,
  .avatar-menu[open] .avatar-trigger {
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
    font-size: calc(11px * var(--chrome-inverse));
    font-weight: 600;
    height: calc(26px * var(--chrome-inverse));
    justify-content: center;
    width: calc(26px * var(--chrome-inverse));
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

  .menu-end {
    border-top: 1px solid var(--border);
  }

  .menu-end .menu-item[aria-disabled='true'] {
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .menu-end .menu-item[aria-disabled='true']:hover {
    background: transparent;
  }

  /* Announced with the disabled item, which stays focusable and hoverable. */
  .visually-hidden {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

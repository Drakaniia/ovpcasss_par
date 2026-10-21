<script lang="ts">
  import { Bell } from '@lucide/svelte';
  import { unreadAccessibleLabel, unreadBadgeLabel, type Notification } from '@par/shared';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import {
    notificationTimeLabel,
    notificationHref,
  } from '$lib/features/notifications/application/notification-view';
  import { formatDateTime } from '$lib/format/datetime';
  import { session, setUnreadNotifications } from '$lib/session/session.svelte';

  /**
   * The bell (phase 11 §4). It shows the three newest notifications and links to
   * the full inbox. The count is the server's; until the account carries it the
   * badge stays absent rather than flashing a wrong zero.
   */
  const MENU_SIZE = 3;

  const count = $derived(session.user?.unreadNotifications);
  const label = $derived(unreadAccessibleLabel(count ?? 0));

  let open = $state(false);
  let loading = $state(false);
  let failed = $state(false);
  let items = $state<Notification[]>([]);
  let container = $state<HTMLDivElement | null>(null);
  let panel = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);

  async function toggle() {
    if (open) {
      close();
      return;
    }

    await show();
  }

  async function show() {
    open = true;
    await refresh();
    await tick();
    focusable()[0]?.focus();
  }

  function close() {
    open = false;
  }

  async function refresh() {
    loading = true;
    failed = false;

    try {
      const response = await api.notifications.list({ filter: 'all', page: 1, size: MENU_SIZE });
      items = response.items;
      setUnreadNotifications(response.unreadCount);
    } catch {
      // The bell never blocks the app; the inbox itself reports failures.
      failed = true;
      items = [];
    } finally {
      loading = false;
    }
  }

  /** Opening a row marks it read here too, so the menu is current on reopen. */
  async function openItem(item: Notification) {
    close();
    if (item.readAt) return;

    const previous = count ?? 0;
    const previousItems = items;

    items = items.map((entry) =>
      entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
    );
    setUnreadNotifications(Math.max(0, previous - 1));

    try {
      const result = await api.notifications.markRead(item.id);
      setUnreadNotifications(result.unreadCount);
    } catch {
      items = previousItems;
      setUnreadNotifications(previous);
    }
  }

  function focusable(): HTMLElement[] {
    return panel ? Array.from(panel.querySelectorAll<HTMLElement>('a, button')) : [];
  }

  function moveFocus(step: number) {
    const targets = focusable();
    if (targets.length === 0) return;

    const current = targets.indexOf(document.activeElement as HTMLElement);
    const next = current === -1 ? 0 : (current + step + targets.length) % targets.length;
    targets[next]?.focus();
  }

  function onWindowClick(event: MouseEvent) {
    if (open && !container?.contains(event.target as Node)) close();
  }

  /** A standard menu: arrows move, Escape closes, and focus returns to the bell. */
  function onWindowKeydown(event: KeyboardEvent) {
    if (!open) return;

    if (event.key === 'Escape') {
      close();
      trigger?.focus();
      return;
    }

    if (!panel?.contains(document.activeElement)) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(-1);
    }
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="bell" bind:this={container}>
  <button
    bind:this={trigger}
    class="bell-button"
    data-tour="notifications"
    type="button"
    aria-haspopup="true"
    aria-expanded={open}
    aria-label={label}
    onclick={() => void toggle()}
  >
    <Bell size={18} aria-hidden="true" />
    {#if count !== undefined && count > 0}
      <span class="count" aria-hidden="true">{unreadBadgeLabel(count)}</span>
    {/if}
  </button>

  {#if open}
    <div class="panel" bind:this={panel} role="group" aria-label="Notifications">
      <div class="panel-head">
        <p class="panel-title">Notifications</p>
        {#if count !== undefined && count > 0}
          <p class="panel-count">{count} unread</p>
        {/if}
      </div>

      {#if loading}
        <div class="panel-rows" aria-busy="true">
          <span class="sr-only">Loading notifications</span>
          {#each [82, 64, 74] as width, index (index)}
            <span class="skeleton line" style="width: {width}%"></span>
          {/each}
        </div>
      {:else if failed}
        <p class="panel-state">Notifications did not load.</p>
      {:else if items.length === 0}
        <p class="panel-state">No notifications yet.</p>
      {:else}
        <ul class="panel-rows">
          {#each items as item (item.id)}
            <li>
              <a
                class="menu-row"
                href={notificationHref(item.target)}
                onclick={() => void openItem(item)}
              >
                <span class="dot" class:is-unread={item.readAt === null} aria-hidden="true"></span>
                {#if item.readAt === null}
                  <span class="sr-only">Unread.</span>
                {/if}
                <span class="menu-body">
                  <span class="menu-description">{item.description}</span>
                  <span class="menu-time" title={formatDateTime(item.createdAt)}>
                    {notificationTimeLabel(item.createdAt)}
                  </span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}

      <a class="menu-footer" href="/notifications" onclick={close}>View all notifications</a>
    </div>
  {/if}
</div>

<style>
  .bell {
    position: relative;
  }

  .bell-button {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-topbar-muted);
    display: inline-flex;
    height: 32px;
    justify-content: center;
    position: relative;
    width: 32px;
  }

  .bell-button:hover {
    background: var(--topbar-hover);
    color: var(--text-on-topbar);
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

  .panel {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-raised);
    color: var(--text-primary);
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 360px;
    z-index: 40;
  }

  .panel-head {
    align-items: baseline;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding: 10px 12px;
  }

  .panel-title {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
  }

  .panel-count {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .panel-rows {
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .line {
    display: block;
    height: 10px;
    margin: 12px;
  }

  .panel-state {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 16px 12px;
  }

  .menu-row {
    align-items: start;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
    display: grid;
    gap: 8px;
    grid-template-columns: 8px 1fr;
    padding: 10px 12px;
  }

  .menu-row:hover {
    background: var(--row-hover);
    text-decoration: none;
  }

  .dot {
    border: 1px solid var(--text-disabled);
    border-radius: 50%;
    height: 8px;
    margin-top: 5px;
    width: 8px;
  }

  .dot.is-unread {
    background: var(--primary);
    border-color: var(--primary);
  }

  .menu-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .menu-description {
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .menu-time {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .menu-footer {
    display: block;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 12px;
  }
</style>

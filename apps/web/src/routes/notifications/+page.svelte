<script lang="ts">
  import type { Notification } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import {
    emptyStateFor,
    groupNotificationsByDay,
    notificationListUrl,
    notificationQueryFrom,
    MARK_ALL_FAILURE_COPY,
    READ_FAILURE_COPY,
  } from '$lib/features/notifications/application/notification-view';
  import { NotificationsPageState } from '$lib/features/notifications/application/notifications-page.svelte';
  import NotificationList from '$lib/features/notifications/presentation/NotificationList.svelte';
  import NotificationsHeader from '$lib/features/notifications/presentation/NotificationsHeader.svelte';
  import NotificationsPagination from '$lib/features/notifications/presentation/NotificationsPagination.svelte';
  import NotificationsSkeleton from '$lib/features/notifications/presentation/NotificationsSkeleton.svelte';
  import { loadSession } from '$lib/session/session.svelte';

  type Gate = 'loading' | 'ready' | 'error';

  const inbox = new NotificationsPageState();

  let gate = $state<Gate>('loading');
  let query = $state(untrack(() => notificationQueryFrom(page.url)));
  /** One clock for the page, so every row agrees on what "today" means. */
  const now = new Date();

  const days = $derived(groupNotificationsByDay(inbox.items, now));
  const empty = $derived(emptyStateFor(query.filter));
  const showList = $derived(gate === 'ready' && inbox.view === 'ready');

  onMount(() => {
    void start();
  });

  // Filter tabs and the pagination footer are plain links, so the URL changes
  // without remounting this page; the effect reloads when it does.
  $effect(() => {
    const next = notificationQueryFrom(page.url);
    if (next.filter === query.filter && next.page === query.page) return;

    query = next;
    if (gate === 'ready') void inbox.load(next);
  });

  async function start(): Promise<void> {
    gate = 'loading';

    try {
      const account = await loadSession();

      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }

      if (account.status !== 'ACTIVE') {
        const destination = destinationAfterSignIn(account);
        if (destination) {
          await goto(destination, { replaceState: true });
        } else {
          await goto('/login', { replaceState: true });
        }
        return;
      }

      gate = 'ready';
      await inbox.load(query);
    } catch {
      gate = 'error';
    }
  }

  /** The row's own link navigates; marking read is optimistic and never blocks it. */
  function openNotification(item: Notification): void {
    void inbox.markRead(item);
  }
</script>

<div class="page-content">
  {#if gate === 'loading'}
    <NotificationsSkeleton />
  {:else if gate === 'error'}
    <ErrorState
      title="We could not load your notifications"
      description="The request did not complete. Try again, or return to the home page."
      onretry={() => void start()}
      backHref="/"
      backLabel="Back to home"
    />
  {:else}
    <NotificationsHeader
      filter={query.filter}
      unreadCount={inbox.unreadCount}
      markingAll={inbox.markingAll}
      onmarkall={() => void inbox.markAllRead()}
    />

    {#if inbox.markAllFailed}
      <div class="inline-alert" role="alert">
        <span>{MARK_ALL_FAILURE_COPY}</span>
        <button
          class="btn btn-outline btn-sm"
          type="button"
          onclick={() => void inbox.markAllRead()}
        >
          Retry
        </button>
      </div>
    {/if}

    {#if inbox.readFailed}
      <p class="inline-note" role="status">{READ_FAILURE_COPY}</p>
    {/if}

    {#if inbox.view === 'loading'}
      <NotificationsSkeleton />
    {:else if inbox.view === 'error'}
      <ErrorState
        title="We could not load your notifications"
        description="The request did not complete. Try again, or return to the home page."
        requestId={inbox.requestId}
        onretry={() => void inbox.retry()}
        backHref="/"
        backLabel="Back to home"
      />
    {:else if inbox.items.length === 0}
      <EmptyState
        title={empty.title}
        description={empty.description}
        action={empty.action}
        actionVariant="outline"
      />
    {:else if showList}
      <NotificationList {days} {now} onopen={openNotification} />
      <NotificationsPagination
        total={inbox.total}
        page={query.page}
        onpage={(next) => void goto(notificationListUrl({ filter: query.filter, page: next }))}
      />
    {/if}
  {/if}
</div>

<style>
  .inline-alert {
    align-items: center;
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    font-size: 13px;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 10px 12px;
  }

  .inline-note {
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 0 0 12px;
  }
</style>

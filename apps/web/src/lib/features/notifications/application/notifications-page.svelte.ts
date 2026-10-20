import type { Notification, NotificationListQuery, NotificationListResponse } from '@par/shared';
import { goto } from '$app/navigation';
import { SvelteDate } from 'svelte/reactivity';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { clearSession, setUnreadNotifications } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

export type NotificationsView = 'loading' | 'ready' | 'error';

/**
 * State for `/notifications` (phase 11 §3). The URL owns the filter and the
 * page; this owns the loaded page, the unread count the bell reads, and the two
 * failure states that are not URL state. Reads are optimistic, and every
 * response carries the server's count so the badge reconciles.
 */
export class NotificationsPageState {
  view = $state<NotificationsView>('loading');
  items = $state<Notification[]>([]);
  total = $state(0);
  size = $state(0);
  unreadCount = $state(0);
  requestId = $state<string | undefined>(undefined);
  /** The row is unread again and the list says so, without blocking (phase 11 §3). */
  readFailed = $state(false);
  markAllFailed = $state(false);
  markingAll = $state(false);

  private query: NotificationListQuery | null = null;

  async load(query: NotificationListQuery): Promise<void> {
    this.query = query;
    this.view = 'loading';
    this.requestId = undefined;

    try {
      const response = await api.notifications.list(query);
      this.apply(response);
      this.view = 'ready';
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }

      this.requestId = error instanceof ApiError ? error.requestId : undefined;
      this.view = 'error';
    }
  }

  retry(): Promise<void> {
    if (!this.query) return Promise.resolve();
    return this.load(this.query);
  }

  /**
   * Marks one row read in place, then tells the server. A failure restores the
   * row: the list must not claim something happened that did not.
   */
  async markRead(item: Notification): Promise<void> {
    if (item.readAt) return;

    const previousCount = this.unreadCount;
    this.patch(item.id, new SvelteDate().toISOString());
    this.count(Math.max(0, previousCount - 1));

    try {
      const result = await api.notifications.markRead(item.id);
      this.patch(item.id, result.notification.readAt ?? new SvelteDate().toISOString());
      this.count(result.unreadCount);
      this.readFailed = false;
    } catch {
      this.patch(item.id, null);
      this.count(previousCount);
      this.readFailed = true;
    }
  }

  /** No confirm: the action is reversible to the reader and costs nothing (phase 11 §3). */
  async markAllRead(): Promise<void> {
    if (this.markingAll) return;
    this.markingAll = true;
    this.markAllFailed = false;

    try {
      const result = await api.notifications.markAllRead();
      const at = new SvelteDate().toISOString();

      this.items = this.items.map((item) => (item.readAt ? item : { ...item, readAt: at }));
      this.count(result.unreadCount);
      toast.success('All notifications marked as read');
    } catch {
      // The rows stay unread, and the alert offers the retry.
      this.markAllFailed = true;
    } finally {
      this.markingAll = false;
    }
  }

  private apply(response: NotificationListResponse): void {
    this.items = response.items;
    this.total = response.total;
    this.size = response.size;
    this.count(response.unreadCount);
  }

  private patch(id: string, readAt: string | null): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, readAt } : item));
  }

  private count(unreadCount: number): void {
    this.unreadCount = unreadCount;
    setUnreadNotifications(unreadCount);
  }
}

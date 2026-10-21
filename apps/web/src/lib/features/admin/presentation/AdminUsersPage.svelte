<script lang="ts">
  import type {
    AdminUser,
    AdminUserListQuery,
    AdminUserListResponse,
    AdminUserSort,
  } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { loadSession, session, signOut } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import {
    PENDING_QUEUE_PATCH,
    clearedFilters,
    filtersEqual,
    filtersFromParams,
    filtersToParams,
    filtersToQuery,
    hasActiveFilters,
    updateFilters,
    type UserFilters,
  } from '../application/user-directory';
  import AdminUsersTable from './AdminUsersTable.svelte';
  import UserDrawer from './UserDrawer.svelte';
  import UsersFilterBar from './UsersFilterBar.svelte';
  import UsersPageHeader from './UsersPageHeader.svelte';
  import UsersPagination from './UsersPagination.svelte';

  type AuthState = 'loading' | 'ready' | 'denied' | 'error';

  let auth = $state<AuthState>('loading');
  let filters = $state<UserFilters>(
    untrack(() => filtersFromParams(new URLSearchParams(page.url.search))),
  );
  let list = $state<AdminUserListResponse | null>(null);
  let loading = $state(true);
  let failure = $state<{ requestId?: string } | null>(null);
  let selected = $state<AdminUser | null>(null);
  let drawerOpen = $state(false);
  let returnFocus: HTMLElement | null = null;

  let requestId = 0;
  let hasLoaded = false;

  const clearHref = $derived(`/admin/users?${filtersToParams(clearedFilters(filters))}`);

  async function loadAccount() {
    auth = 'loading';

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
          await signOut();
          await goto('/login', { replaceState: true });
        }
        return;
      }

      auth = account.role === 'ADMIN' ? 'ready' : 'denied';
    } catch {
      auth = 'error';
    }
  }

  async function loadUsers(query: AdminUserListQuery) {
    const token = ++requestId;

    if (!hasLoaded) loading = true;
    failure = null;

    try {
      const result = await api.admin.users.list(query);
      if (token !== requestId) return;

      list = result;
      hasLoaded = true;
    } catch (error) {
      if (token !== requestId) return;

      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await goto('/login', { replaceState: true });
        return;
      }

      failure = { requestId: error instanceof ApiError ? error.requestId : undefined };
    } finally {
      if (token === requestId) loading = false;
    }
  }

  async function applyFilters(patch: Partial<UserFilters>) {
    const next = updateFilters(filters, patch);
    if (filtersEqual(next, filters)) return;

    filters = next;
    await goto(`/admin/users?${filtersToParams(next)}`, { replaceState: true });
  }

  function sortBy(field: AdminUserSort) {
    const dir = filters.sort === field && filters.dir === 'asc' ? 'desc' : 'asc';
    void applyFilters({ sort: field, dir });
  }

  function retry() {
    hasLoaded = false;
    void loadUsers(filtersToQuery(filters));
  }

  function openUser(user: AdminUser, row: HTMLElement) {
    returnFocus = row;
    selected = user;
    drawerOpen = true;
  }

  function closeDrawer() {
    const target = returnFocus;
    drawerOpen = false;
    selected = null;

    // Escape and the close button return focus to the row that opened the drawer.
    void tick().then(() => target?.focus());
  }

  function handleChanged(updated: AdminUser, message: string) {
    toast.success(message);
    closeDrawer();

    if (list) {
      list = {
        ...list,
        items: list.items.map((item) => (item.id === updated.id ? updated : item)),
      };
    }

    void loadUsers(filtersToQuery(filters));
  }

  /** A concurrent change wins; show the server's state instead of overwriting it. */
  async function refreshSelected() {
    const current = selected;
    if (!current) return;

    try {
      const fresh = await api.admin.users.get(current.id);
      selected = fresh;

      if (list) {
        list = {
          ...list,
          items: list.items.map((item) => (item.id === fresh.id ? fresh : item)),
        };
      }
    } catch {
      await loadUsers(filtersToQuery(filters));
      const match = list?.items.find((item) => item.id === current.id);
      if (match) selected = match;
    }
  }

  onMount(() => {
    // Make the default view explicit so a refresh or a copied URL reproduces
    // exactly what the administrator is looking at.
    if (!new URLSearchParams(page.url.search).has('status')) {
      void goto(`/admin/users?${filtersToParams(filters)}`, { replaceState: true });
    }

    void loadAccount();
  });

  // Back/forward or a shared link replaces the local filter state.
  $effect(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(page.url.search));
    if (
      !filtersEqual(
        fromUrl,
        untrack(() => filters),
      )
    )
      filters = fromUrl;
  });

  $effect(() => {
    if (auth !== 'ready') return;
    void loadUsers(filtersToQuery(filters));
  });
</script>

<svelte:head><title>Users &amp; roles · OVPCASSS Paperless PAR</title></svelte:head>

{#if auth === 'denied'}
  <ErrorState
    variant="permission"
    requiredRole="ADMIN"
    title="This page requires the Admin role."
    description="Only an administrator can assign roles and manage accounts. Sign in with an administrator account to continue."
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if auth === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to your inbox."
    onretry={() => void loadAccount()}
    backHref="/"
    backLabel="Back to inbox"
  />
{:else}
  <div class="admin-users">
    <UsersPageHeader
      pendingRoleCount={list?.pendingRoleCount ?? 0}
      onreview={() => void applyFilters(PENDING_QUEUE_PATCH)}
    />

    <UsersFilterBar {filters} onchange={(patch) => void applyFilters(patch)} />

    {#if failure}
      <ErrorState
        title="We could not load users"
        description="The account list did not load. Try again, or return to your inbox."
        requestId={failure.requestId}
        onretry={retry}
        backHref="/"
        backLabel="Back to inbox"
      />
    {:else if loading || !list}
      <SkeletonTable rows={8} widths={[22, 26, 12, 14, 10, 12, 4]} />
    {:else if list.items.length === 0}
      {#if hasActiveFilters(filters)}
        <EmptyState
          title="No accounts match these filters."
          description="Adjust the filters, or clear them to see every account."
          action={{ label: 'Clear filters', href: clearHref }}
          actionVariant="outline"
        />
      {:else}
        <EmptyState
          title="No accounts yet."
          description="Accounts appear here after someone registers with a university email address."
        />
      {/if}
    {:else}
      <AdminUsersTable
        users={list.items}
        {filters}
        selectedId={selected?.id ?? null}
        onsort={sortBy}
        onopen={openUser}
      />

      <UsersPagination
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        onpage={(next) => void applyFilters({ page: next })}
        onpagesize={(size) => void applyFilters({ pageSize: size })}
      />
    {/if}
  </div>

  {#if drawerOpen && selected}
    <UserDrawer
      user={selected}
      isSelf={selected.id === session.user?.id}
      onclose={closeDrawer}
      onchanged={handleChanged}
      onconflict={refreshSelected}
    />
  {/if}
{/if}

<style>
  .admin-users {
    display: flex;
    flex-direction: column;
  }
</style>

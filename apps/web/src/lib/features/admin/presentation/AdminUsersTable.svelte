<script lang="ts">
  import type { AdminUser, AdminUserSort } from '@par/shared';
  import { MoreHorizontal } from '@lucide/svelte';

  import { formatDate } from '$lib/format/datetime';

  import { USER_ROLE_LABELS, type UserFilters } from '../application/user-directory';
  import UserStatusBadge from './UserStatusBadge.svelte';

  let {
    users,
    filters,
    selectedId,
    onsort,
    onopen,
  }: {
    users: AdminUser[];
    filters: UserFilters;
    selectedId: string | null;
    onsort: (field: AdminUserSort) => void;
    onopen: (user: AdminUser, row: HTMLElement) => void;
  } = $props();

  function ariaSort(field: AdminUserSort): 'ascending' | 'descending' | 'none' {
    if (filters.sort !== field) return 'none';
    return filters.dir === 'asc' ? 'ascending' : 'descending';
  }

  function indicator(): string {
    return filters.dir === 'asc' ? '▲' : '▼';
  }

  function open(user: AdminUser, row: HTMLElement) {
    row.focus();
    onopen(user, row);
  }
</script>

<div class="table-scroll">
  <table class="data-table" aria-label="Accounts">
    <thead>
      <tr>
        <th scope="col" aria-sort={ariaSort('name')}>
          <button class="sort-button" type="button" onclick={() => onsort('name')}>
            Name
            {#if filters.sort === 'name'}
              <span class="sort-indicator" aria-hidden="true">{indicator()}</span>
            {/if}
          </button>
        </th>
        <th scope="col">Email</th>
        <th scope="col" class="col-role">Role</th>
        <th scope="col">Status</th>
        <th scope="col" class="col-campus">Campus</th>
        <th scope="col" class="col-registered" aria-sort={ariaSort('registered')}>
          <button class="sort-button" type="button" onclick={() => onsort('registered')}>
            Registered
            {#if filters.sort === 'registered'}
              <span class="sort-indicator" aria-hidden="true">{indicator()}</span>
            {/if}
          </button>
        </th>
        <th scope="col" class="col-actions"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>

    <tbody>
      {#each users as user (user.id)}
        <tr
          tabindex="0"
          aria-selected={selectedId === user.id}
          onclick={(event) => open(user, event.currentTarget)}
          onkeydown={(event) => {
            if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
            event.preventDefault();
            open(user, event.currentTarget);
          }}
        >
          <td class="name">{user.fullName}</td>
          <td class="email" title={user.email}>{user.email}</td>
          <td class="col-role">{user.role ? USER_ROLE_LABELS[user.role] : '—'}</td>
          <td><UserStatusBadge status={user.status} /></td>
          <td class="col-campus">{user.campusUnit ?? '—'}</td>
          <td class="col-registered mono">{formatDate(user.registeredAt)}</td>
          <td class="col-actions">
            <button
              class="row-menu"
              type="button"
              aria-label="Open account for {user.fullName}"
              onclick={(event) => {
                event.stopPropagation();
                const row = (event.currentTarget as HTMLElement).closest('tr');
                if (row) open(user, row);
              }}
            >
              <MoreHorizontal size={16} aria-hidden="true" />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .name {
    font-weight: 500;
  }

  .email {
    color: var(--text-secondary);
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sort-button {
    align-items: center;
    background: transparent;
    color: inherit;
    display: inline-flex;
    font: inherit;
    gap: 4px;
    padding: 0;
  }

  .sort-button:hover {
    color: var(--text-primary);
  }

  .col-actions {
    text-align: right;
    width: 48px;
  }

  .row-menu {
    align-items: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .row-menu:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  /* Campus hides first, then Registered; Name, Status, and the menu never hide. */
  @media (max-width: 1279px) {
    .col-campus {
      display: none;
    }
  }

  @media (max-width: 1119px) {
    .col-registered {
      display: none;
    }
  }
</style>

<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import {
    USER_ROLE_LABELS,
    USER_ROLES_ALL,
    USER_STATUSES_ALL,
    USER_STATUS_PRESENTATION,
    type UserFilters,
  } from '../application/user-directory';

  let {
    filters,
    onchange,
  }: {
    filters: UserFilters;
    onchange: (patch: Partial<UserFilters>) => void;
  } = $props();

  let query = $state(untrack(() => filters.q));
  let timer: ReturnType<typeof setTimeout> | undefined;

  // URL changes (Clear filters, a shared link) win; typing does not echo back.
  $effect(() => {
    const next = filters.q;
    if (untrack(() => query) !== next) query = next;
  });

  $effect(() => () => clearTimeout(timer));

  function queueQuery(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    clearTimeout(timer);
    timer = setTimeout(() => onchange({ q: value.trim() }), 250);
  }
</script>

<div class="filter-bar" role="search" aria-label="Filter accounts">
  <div class="search-field">
    <span class="search-icon" aria-hidden="true">
      <Search size={16} />
    </span>
    <input
      class="input"
      type="search"
      value={query}
      placeholder="Search name or email"
      aria-label="Search name or email"
      autocomplete="off"
      data-search-field
      oninput={queueQuery}
    />
  </div>

  <select
    class="select filter-select"
    aria-label="Filter by role"
    value={filters.role}
    onchange={(event) => onchange({ role: event.currentTarget.value as UserFilters['role'] })}
  >
    <option value="ALL">All roles</option>
    {#each USER_ROLES_ALL as role (role)}
      <option value={role}>{USER_ROLE_LABELS[role]}</option>
    {/each}
  </select>

  <select
    class="select filter-select"
    aria-label="Filter by status"
    value={filters.status}
    onchange={(event) => onchange({ status: event.currentTarget.value as UserFilters['status'] })}
  >
    <option value="ALL">All statuses</option>
    {#each USER_STATUSES_ALL as status (status)}
      <option value={status}>{USER_STATUS_PRESENTATION[status].label}</option>
    {/each}
  </select>
</div>

<style>
  .filter-bar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .search-field {
    position: relative;
    width: 300px;
  }

  .search-icon {
    color: var(--text-secondary);
    display: inline-flex;
    left: 10px;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .search-field .input {
    padding-left: 32px;
  }

  .filter-select {
    width: 168px;
  }

  @media (max-width: 1279px) {
    .search-field {
      width: 240px;
    }
  }
</style>

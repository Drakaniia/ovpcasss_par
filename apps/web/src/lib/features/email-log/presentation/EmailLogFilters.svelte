<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import {
    EMAIL_DELIVERY_STATUSES,
    EMAIL_DELIVERY_STATUS_LABELS,
    EMAIL_KINDS,
    EMAIL_KIND_LABELS,
    type EmailDeliveryStatus,
    type EmailKind,
  } from '@par/shared';

  import type { EmailLogFilters } from '../application/email-log.svelte';

  let {
    filters,
    onchange,
    onshowall,
  }: {
    filters: EmailLogFilters;
    onchange: (patch: Partial<EmailLogFilters>) => void;
    onshowall: () => void;
  } = $props();

  let query = $state(untrack(() => filters.to));
  let timer: ReturnType<typeof setTimeout> | undefined;

  // A shared link or Clear filters wins; typing does not echo back.
  $effect(() => {
    const next = filters.to;
    if (untrack(() => query) !== next) query = next;
  });

  $effect(() => () => clearTimeout(timer));

  function queueQuery(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    clearTimeout(timer);
    timer = setTimeout(() => onchange({ to: value.trim() }), 250);
  }
</script>

<div class="filter-bar" role="search" aria-label="Filter the email log">
  <div class="search-field">
    <span class="search-icon" aria-hidden="true"><Search size={16} /></span>
    <input
      class="input"
      type="search"
      value={query}
      placeholder="Search recipient"
      aria-label="Search recipient"
      autocomplete="off"
      oninput={queueQuery}
    />
  </div>

  <select
    class="select filter-select"
    aria-label="Filter by delivery status"
    value={filters.status}
    onchange={(event) =>
      onchange({ status: event.currentTarget.value as EmailDeliveryStatus | 'ALL' })}
  >
    {#each EMAIL_DELIVERY_STATUSES as status (status)}
      <option value={status}>{EMAIL_DELIVERY_STATUS_LABELS[status]}</option>
    {/each}
    <option value="ALL">All statuses</option>
  </select>

  <select
    class="select filter-select"
    aria-label="Filter by message kind"
    value={filters.kind}
    onchange={(event) => onchange({ kind: event.currentTarget.value as EmailKind | 'ALL' })}
  >
    <option value="ALL">All kinds</option>
    {#each EMAIL_KINDS as kind (kind)}
      <option value={kind}>{EMAIL_KIND_LABELS[kind]}</option>
    {/each}
  </select>

  {#if filters.status !== 'ALL'}
    <button class="btn btn-ghost btn-sm" type="button" onclick={onshowall}>
      Show all messages
    </button>
  {/if}
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
    min-width: 240px;
    position: relative;
  }

  .search-field .input {
    padding-left: 34px;
    width: 100%;
  }

  .search-icon {
    color: var(--text-secondary);
    left: 11px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .filter-select {
    min-width: 150px;
    width: auto;
  }
</style>

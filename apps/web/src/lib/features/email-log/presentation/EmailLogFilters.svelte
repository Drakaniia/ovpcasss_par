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

  import EditableSelect from '$lib/components/EditableSelect.svelte';

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

  const STATUS_OPTIONS = [
    ...EMAIL_DELIVERY_STATUSES.map((status) => ({
      value: status,
      label: EMAIL_DELIVERY_STATUS_LABELS[status],
    })),
    { value: 'ALL', label: 'All statuses' },
  ];

  const KIND_OPTIONS = [
    { value: 'ALL', label: 'All kinds' },
    ...EMAIL_KINDS.map((kind) => ({ value: kind, label: EMAIL_KIND_LABELS[kind] })),
  ];

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

  <div class="filter-select">
    <EditableSelect
      id="email-log-status"
      label="Delivery status"
      value={filters.status}
      options={STATUS_OPTIONS}
      searchable={false}
      onchange={(value) => onchange({ status: value as EmailDeliveryStatus | 'ALL' })}
    />
  </div>

  <div class="filter-select">
    <EditableSelect
      id="email-log-kind"
      label="Message kind"
      value={filters.kind}
      options={KIND_OPTIONS}
      searchable={false}
      onchange={(value) => onchange({ kind: value as EmailKind | 'ALL' })}
    />
  </div>

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

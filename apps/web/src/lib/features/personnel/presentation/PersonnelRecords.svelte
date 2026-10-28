<script lang="ts">
  import type { MyReceipt, ReportListResponse, ReportPageSize } from '@par/shared';
  import { Search } from '@lucide/svelte';

  import DatePicker from '$lib/components/DatePicker.svelte';
  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ReceiptPreview from '$lib/features/receipts/presentation/ReceiptPreview.svelte';
  import ReportsPagination from '$lib/features/reports/presentation/ReportsPagination.svelte';

  import {
    hasPersonnelFilters,
    personnelRows,
    type PersonnelFilters,
  } from '../application/personnel-records';
  import ActivityPreviewDialog from './ActivityPreviewDialog.svelte';
  import PersonnelRecordsTable from './PersonnelRecordsTable.svelte';

  let {
    records,
    filters,
    receipts = [],
    onchange,
    onpage,
    onpagesize,
    onclear,
  }: {
    records: ReportListResponse;
    filters: PersonnelFilters;
    /** The caller's own receipts, keyed by the record they belong to. */
    receipts?: readonly MyReceipt[];
    onchange: (patch: Partial<PersonnelFilters>) => void;
    onpage: (page: number) => void;
    onpagesize: (size: ReportPageSize) => void;
    onclear: () => void;
  } = $props();

  const rows = $derived(personnelRows(records.items));
  const filtered = $derived(hasPersonnelFilters(filters));
  const receiptsByReport = $derived(
    new Map(receipts.map((receipt) => [receipt.reportId, receipt])),
  );

  let previewing = $state<MyReceipt | null>(null);
  /** The activity whose preview dialog is open, if any (report 4). */
  let previewingActivity = $state<string | null>(null);

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'returned', label: 'Returned' },
    { value: 'approved', label: 'Approved' },
  ] as const;
</script>

<section class="card records" aria-labelledby="records-head">
  <header class="panel-head">
    <h2 id="records-head">Records</h2>
    <p class="count">
      {records.total}
      {records.total === 1 ? 'record' : 'records'}
    </p>
  </header>

  <div class="toolbar" role="search" aria-label="Filter your records">
    <label class="search">
      <Search size={15} aria-hidden="true" />
      <span class="visually-hidden">Search records</span>
      <input
        class="search-input"
        type="search"
        placeholder="Search AR No., title, or location"
        value={filters.q}
        oninput={(event) => onchange({ q: event.currentTarget.value })}
      />
    </label>

    <label class="filter">
      <span class="filter-label">Status</span>
      <EditableSelect
        id="personnel-filter-status"
        label="Status"
        value={filters.status}
        searchable={false}
        options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        onchange={(value) => onchange({ status: value as PersonnelFilters['status'] })}
      />
    </label>

    <label class="filter">
      <span class="filter-label">From</span>
      <DatePicker
        id="personnel-filter-from"
        value={filters.from}
        dense
        onchange={(iso) => onchange({ from: iso })}
      />
    </label>

    <label class="filter">
      <span class="filter-label">To</span>
      <DatePicker
        id="personnel-filter-to"
        value={filters.to}
        dense
        onchange={(iso) => onchange({ to: iso })}
      />
    </label>

    {#if filtered}
      <button class="btn btn-ghost btn-sm clear" type="button" onclick={onclear}>
        Clear filters
      </button>
    {/if}
  </div>

  {#if rows.length === 0}
    {#if filtered}
      <EmptyState
        title="No records match these filters"
        description="Clear the filters to see every record that names you."
        action={{ label: 'Clear filters', href: '/' }}
        actionVariant="outline"
      />
    {:else}
      <EmptyState
        title="No activities are registered yet"
        description="The OVPCASSS office registers each activity. When one appears here, open it to write its narrative report."
      />
    {/if}
  {:else}
    <PersonnelRecordsTable
      {rows}
      flush
      receipts={receiptsByReport}
      onreceipt={(receipt) => (previewing = receipt)}
      onopen={(row) => (previewingActivity = row.id)}
    />

    {#if records.total > records.size}
      <div class="panel-foot">
        <ReportsPagination
          total={records.total}
          page={records.page}
          pageSize={records.size}
          {onpage}
          {onpagesize}
        />
      </div>
    {/if}
  {/if}

  {#if previewing}
    <ReceiptPreview
      reportId={previewing.reportId}
      receipt={previewing}
      onclose={() => (previewing = null)}
    />
  {/if}

  {#if previewingActivity}
    <ActivityPreviewDialog
      recordId={previewingActivity}
      onclose={() => (previewingActivity = null)}
    />
  {/if}
</section>

<style>
  .records {
    overflow: hidden;
  }

  .panel-head {
    align-items: baseline;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 14px 18px;
  }

  h2 {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .count {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  /* The filters sit on paper stock so the register below stays the white surface. */
  .toolbar {
    align-items: flex-end;
    background: var(--surface-paper);
    border-bottom: 1px solid var(--border);
    border-top: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 12px 18px;
  }

  .search {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: flex;
    flex: 1 1 240px;
    gap: 8px;
    min-height: 34px;
    padding: 0 10px;
    transition:
      border-color var(--duration-fast) ease,
      box-shadow var(--duration-base) ease;
  }

  .search:focus-within {
    border-color: var(--focus-ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 16%, transparent);
  }

  .search-input {
    background: transparent;
    border: 0;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    min-height: 32px;
    outline: none;
    width: 100%;
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

  .filter {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .filter-label {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .clear {
    margin-bottom: 1px;
  }

  .panel-foot {
    border-top: 1px solid var(--border);
    padding: 0 18px 10px;
  }
</style>

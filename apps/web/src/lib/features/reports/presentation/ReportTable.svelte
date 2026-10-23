<script lang="ts">
  import type { ReportSortField, SortDirection } from '@par/shared';
  import { ArrowDown, ArrowUp, ChevronRight, Pencil, RefreshCw, Trash2 } from '@lucide/svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { updatedLabel, type RegisterRow } from '../application/report-register';

  let {
    rows,
    sort,
    dir,
    role,
    now = new Date(),
    onsort,
    onedit,
    ondelete,
    onresend,
  }: {
    rows: readonly RegisterRow[];
    sort: ReportSortField;
    dir: SortDirection;
    role: 'ADMIN' | 'PERSONNEL' | null;
    now?: Date;
    onsort: (field: ReportSortField) => void;
    onedit: (row: RegisterRow) => void;
    ondelete: (row: RegisterRow) => void;
    onresend: (row: RegisterRow) => void;
  } = $props();

  const admin = $derived(role === 'ADMIN');

  const COLUMNS: { field: ReportSortField; label: string }[] = [
    { field: 'referenceNo', label: 'AR No.' },
    { field: 'status', label: 'Status' },
    { field: 'updated', label: 'Last updated' },
  ];

  function ariaSort(field: ReportSortField): 'ascending' | 'descending' | 'none' {
    if (sort !== field) return 'none';
    return dir === 'asc' ? 'ascending' : 'descending';
  }
</script>

<div class="table-scroll">
  <table class="data-table register-table">
    <caption class="visually-hidden">Office register of post-activity reports</caption>
    <thead>
      <tr>
        {#each COLUMNS.slice(0, 1) as column (column.field)}
          <th scope="col" aria-sort={ariaSort(column.field)}>
            <button class="sort" type="button" onclick={() => onsort(column.field)}>
              {column.label}
              {#if sort === column.field}
                {#if dir === 'asc'}<ArrowUp size={13} aria-hidden="true" />{:else}<ArrowDown
                    size={13}
                    aria-hidden="true"
                  />{/if}
              {/if}
            </button>
          </th>
        {/each}
        <th scope="col">Activity</th>
        <th scope="col">Personnel in charge</th>
        {#each COLUMNS.slice(1) as column (column.field)}
          <th scope="col" aria-sort={ariaSort(column.field)}>
            <button class="sort" type="button" onclick={() => onsort(column.field)}>
              {column.label}
              {#if sort === column.field}
                {#if dir === 'asc'}<ArrowUp size={13} aria-hidden="true" />{:else}<ArrowDown
                    size={13}
                    aria-hidden="true"
                  />{/if}
              {/if}
            </button>
          </th>
        {/each}
        <th scope="col" class="actions-head"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr>
          <td class="reference-cell">
            <a class="reference" href={row.href}>{row.referenceNo}</a>
          </td>
          <td class="activity-cell">
            <a class="title" href={row.href}>{row.title}</a>
            <p class="meta">{row.meta}</p>
          </td>
          <td class="pic-cell">{row.picNames}</td>
          <td><StatusBadge status={row.status} /></td>
          <td class="updated-cell">{updatedLabel(row.updatedAt, now)}</td>
          <td class="actions-cell">
            {#if admin}
              <div class="row-actions">
                {#if row.canEdit}
                  <button
                    class="icon-action"
                    type="button"
                    aria-label="Edit {row.referenceNo}"
                    onclick={() => onedit(row)}
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                {/if}
                {#if row.canResend}
                  <button
                    class="icon-action"
                    type="button"
                    aria-label="Resend invitation for {row.referenceNo}"
                    onclick={() => onresend(row)}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                  </button>
                {/if}
                {#if row.canDelete}
                  <button
                    class="icon-action remove"
                    type="button"
                    aria-label="Delete {row.referenceNo}"
                    onclick={() => ondelete(row)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                {/if}
              </div>
            {:else}
              <a class="row-action" href={row.action.href}>
                {row.action.label}
                <ChevronRight size={14} aria-hidden="true" />
              </a>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .register-table {
    width: 100%;
  }

  .sort {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    display: inline-flex;
    font: inherit;
    gap: 4px;
    padding: 0;
  }

  .reference {
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .activity-cell {
    max-width: 380px;
  }

  .title {
    color: var(--text-primary);
    font-weight: 500;
  }

  .meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pic-cell {
    color: var(--text-secondary);
    font-size: 12px;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .updated-cell {
    color: var(--text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }

  .actions-cell {
    text-align: right;
    width: 1%;
  }

  .row-actions {
    display: inline-flex;
    gap: 2px;
  }

  .icon-action {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .icon-action:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .icon-action.remove:hover {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .row-action {
    align-items: center;
    display: inline-flex;
    font-size: 12px;
    gap: 2px;
    white-space: nowrap;
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
</style>

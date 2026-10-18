<script lang="ts">
  import type { ReportSortField, SortDirection } from '@par/shared';

  import StatusBadge from '$lib/components/StatusBadge.svelte';

  import type { ReportRow } from '../application/report-list';
  import ReportRowMenu from './ReportRowMenu.svelte';

  let {
    rows,
    sort,
    dir,
    onsort,
    onopen,
    onedit,
    ondelete,
  }: {
    rows: ReportRow[];
    sort: ReportSortField;
    dir: SortDirection;
    onsort: (field: ReportSortField) => void;
    onopen: (row: ReportRow) => void;
    onedit: (row: ReportRow) => void;
    ondelete: (row: ReportRow) => void;
  } = $props();

  const indicator = $derived(dir === 'asc' ? '▲' : '▼');

  function ariaSort(field: ReportSortField): 'ascending' | 'descending' | 'none' {
    if (sort !== field) return 'none';
    return dir === 'asc' ? 'ascending' : 'descending';
  }

  function sortButton(field: ReportSortField): void {
    onsort(field);
  }
</script>

<div class="table-scroll reports-scroll">
  <table class="data-table reports-table" aria-label="My reports">
    <caption class="visually-hidden">
      Reports you can see, sorted by {sort === 'updated' ? 'last update' : sort}, {dir === 'asc'
        ? 'ascending'
        : 'descending'}
    </caption>

    <thead>
      <tr>
        <th scope="col" class="col-tracking" aria-sort={ariaSort('trackingNumber')}>
          <button class="sort-button" type="button" onclick={() => sortButton('trackingNumber')}>
            Tracking no.
            {#if sort === 'trackingNumber'}
              <span class="sort-indicator" aria-hidden="true">{indicator}</span>
            {/if}
          </button>
        </th>
        <th scope="col">Title</th>
        <th scope="col" class="col-type">Type</th>
        <th scope="col" aria-sort={ariaSort('status')}>
          <button class="sort-button" type="button" onclick={() => sortButton('status')}>
            Status
            {#if sort === 'status'}
              <span class="sort-indicator" aria-hidden="true">{indicator}</span>
            {/if}
          </button>
        </th>
        <th scope="col" class="col-activity" aria-sort={ariaSort('activityDate')}>
          <button class="sort-button" type="button" onclick={() => sortButton('activityDate')}>
            Activity date
            {#if sort === 'activityDate'}
              <span class="sort-indicator" aria-hidden="true">{indicator}</span>
            {/if}
          </button>
        </th>
        <th scope="col" aria-sort={ariaSort('updated')}>
          Updated
          {#if sort === 'updated'}
            <span class="sort-indicator" aria-hidden="true">{indicator}</span>
          {/if}
        </th>
        <th scope="col" class="col-actions"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>

    <tbody>
      {#each rows as row (row.id)}
        <tr
          tabindex="0"
          onclick={() => onopen(row)}
          onkeydown={(event) => {
            if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
            event.preventDefault();
            onopen(row);
          }}
        >
          <td class="mono col-tracking">
            <span class="tracking-value">{row.trackingNumber ?? '—'}</span>
          </td>

          <td class="col-title">
            <span class="title-text" title={row.title}>{row.title}</span>
          </td>

          <td class="col-type type">{row.typeLabel}</td>

          <td><StatusBadge status={row.status} /></td>

          <td class="mono col-activity">{row.activityDate}</td>

          <td class="mono updated" title={row.updatedExact}>{row.updatedRelative}</td>

          <td class="col-actions">
            <ReportRowMenu
              {row}
              onopen={() => onopen(row)}
              onedit={() => onedit(row)}
              ondelete={() => ondelete(row)}
            />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .reports-scroll {
    max-height: calc(100vh - 300px);
    min-height: 120px;
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

  .col-tracking {
    min-width: 210px;
  }

  .tracking-value {
    color: var(--text-secondary);
  }

  .col-title {
    min-width: 220px;
  }

  .title-text {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--text-primary);
    display: -webkit-box;
    font-weight: 500;
    line-clamp: 2;
    line-height: 1.3;
    max-width: 320px;
    overflow: hidden;
  }

  .type {
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .updated {
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .col-actions {
    text-align: right;
    width: 48px;
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

  /* Type hides first, then Activity date; Tracking, Title, Status, and ⋯ never hide. */
  @media (max-width: 1279px) {
    .col-type {
      display: none;
    }
  }

  @media (max-width: 1119px) {
    .col-activity {
      display: none;
    }
  }
</style>

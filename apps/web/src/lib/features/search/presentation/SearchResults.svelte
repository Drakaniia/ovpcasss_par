<script lang="ts">
  import type { RepositorySortField } from '@par/shared';

  import StatusBadge from '$lib/components/StatusBadge.svelte';

  import { sortDirectionFor } from '../application/repository-filter-scope';
  import type { RepositoryFilters } from '../application/repository-filters';
  import type { RepositoryRow } from '../application/repository-rows';
  import { paneWide } from './repository-viewport';

  /**
   * Repository results (UI spec §7.11). Received and Title sort; the title is the
   * row link. At desktop widths a click or keyboard activation selects the
   * report in the preview pane; a modified click keeps the browser's behaviour.
   */
  let {
    rows,
    filters,
    selectedId = null,
    onsort,
    onselect,
  }: {
    rows: RepositoryRow[];
    filters: RepositoryFilters;
    selectedId?: string | null;
    onsort: (field: RepositorySortField) => void;
    /** Row click: the page decides between the preview pane and the report page. */
    onselect: (row: RepositoryRow) => void;
  } = $props();

  const indicator = $derived(filters.dir === 'asc' ? '▲' : '▼');

  function rowClick(event: MouseEvent, row: RepositoryRow) {
    if (event.target instanceof Element && event.target.closest('a')) return;
    onselect(row);
  }

  function linkClick(event: MouseEvent, row: RepositoryRow) {
    // A modified click is left to the browser (new tab, new window, download).
    if (!paneWide() || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onselect(row);
  }

  /** Enter and Space open the focused row, including the row focus after close. */
  function rowKeydown(event: KeyboardEvent, row: RepositoryRow) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target instanceof Element && event.target.closest('a')) return;
    event.preventDefault();
    onselect(row);
  }
</script>

<div class="table-scroll results-scroll">
  <table class="data-table results-table" aria-label="Repository results">
    <caption class="sr-only">
      Repository results, ordered by {filters.sort === 'received' ? 'date received' : 'title'},
      {filters.dir === 'asc' ? 'ascending' : 'descending'}
    </caption>

    <thead>
      <tr>
        <th scope="col" class="col-received" aria-sort={sortDirectionFor(filters, 'received')}>
          <button class="sort-button" type="button" onclick={() => onsort('received')}>
            Received
            {#if filters.sort === 'received'}
              <span class="sort-indicator" aria-hidden="true">{indicator}</span>
            {/if}
          </button>
        </th>
        <th scope="col" class="col-reference">AR No.</th>
        <th scope="col" class="col-title" aria-sort={sortDirectionFor(filters, 'title')}>
          <button class="sort-button" type="button" onclick={() => onsort('title')}>
            Title
            {#if filters.sort === 'title'}
              <span class="sort-indicator" aria-hidden="true">{indicator}</span>
            {/if}
          </button>
        </th>
        <th scope="col" class="col-type">Type</th>
        <th scope="col" class="col-college">College</th>
        <th scope="col">Status</th>
      </tr>
    </thead>

    <tbody>
      {#each rows as row (row.id)}
        <tr
          id={`report-row-${row.id}`}
          tabindex="-1"
          aria-selected={selectedId === row.id}
          onclick={(event) => rowClick(event, row)}
          onkeydown={(event) => rowKeydown(event, row)}
        >
          <td class="mono col-received">{row.received}</td>

          <td class="mono col-reference">
            <span class="reference-value">{row.referenceNo ?? '—'}</span>
          </td>

          <td class="col-title">
            <a
              class="title-link"
              href={row.href}
              title={row.title}
              onclick={(event) => linkClick(event, row)}
            >
              {#each row.titleSegments as segment, index (index)}{#if segment.match}<mark
                    class="match">{segment.text}</mark
                  >{:else}{segment.text}{/if}{/each}
            </a>

            {#if row.snippet}
              <span class="snippet">
                {#each row.snippetSegments as segment, index (index)}{#if segment.match}<mark
                      class="match">{segment.text}</mark
                    >{:else}{segment.text}{/if}{/each}
              </span>
            {/if}
          </td>

          <td class="col-type type">{row.typeLabel}</td>

          <td class="col-college type" title={row.college}>{row.college}</td>

          <td><StatusBadge status={row.status} /></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .results-scroll {
    max-height: calc(100vh - 340px);
    min-height: 160px;
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

  .col-received {
    min-width: 110px;
    white-space: nowrap;
  }

  .col-reference {
    min-width: 180px;
  }

  .reference-value {
    color: var(--text-secondary);
  }

  .col-title {
    min-width: 220px;
  }

  .title-link {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--text-primary);
    display: -webkit-box;
    font-weight: 500;
    line-clamp: 2;
    line-height: 1.3;
    overflow: hidden;
  }

  .title-link:hover {
    color: var(--link);
  }

  .snippet {
    color: var(--text-secondary);
    display: block;
    font-size: 12px;
    line-height: 1.35;
    margin-top: 2px;
    max-width: 420px;
  }

  /* A match is marked with a tint and an underline, never color alone. */
  .match {
    background: var(--brand-gold-100);
    border-bottom: 1px solid var(--brand-gold-600);
    color: inherit;
  }

  .type {
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .col-college {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The open row is marked with a navy leading edge and medium weight, plus
     aria-selected, so the state never rides on colour alone. */
  tbody tr[aria-selected='true'] {
    box-shadow: inset 2px 0 0 var(--brand-navy-800);
  }

  tbody tr[aria-selected='true'] .title-link {
    font-weight: 600;
  }

  /* College hides first, then Type; received, AR No., title, and status stay. */
  @media (max-width: 1279px) {
    .col-college {
      display: none;
    }
  }

  @media (max-width: 1099px) {
    .col-type {
      display: none;
    }
  }
</style>

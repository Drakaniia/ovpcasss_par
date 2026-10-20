<script lang="ts">
  import type { ReferenceEntityConfig, ReferenceRow } from '../application/reference-types';
  import ReferenceRowMenu from './ReferenceRowMenu.svelte';
  import ReferenceStatusBadge from './ReferenceStatusBadge.svelte';

  let {
    config,
    rows,
    selectedId,
    onopen,
    ondeactivate,
    onactivate,
  }: {
    config: ReferenceEntityConfig;
    rows: ReferenceRow[];
    selectedId: string | null;
    onopen: (row: ReferenceRow, element: HTMLElement) => void;
    ondeactivate: (row: ReferenceRow) => void;
    onactivate: (row: ReferenceRow) => void;
  } = $props();

  const columns = $derived(config.columns(rows));

  function open(row: ReferenceRow, element: HTMLElement) {
    element.focus();
    onopen(row, element);
  }
</script>

<div class="table-scroll">
  <table class="data-table" aria-label={config.label}>
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th scope="col" class:num={column.numeric} class:table-col-secondary={column.secondary}>
            {column.label}
          </th>
        {/each}
        <th scope="col" class="col-actions"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>

    <tbody>
      {#each rows as row (row.id)}
        <tr
          id="reference-row-{row.id}"
          tabindex="0"
          class:is-inactive={!row.isActive}
          aria-selected={selectedId === row.id}
          onclick={(event) => open(row, event.currentTarget)}
          onkeydown={(event) => {
            if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
            event.preventDefault();
            open(row, event.currentTarget);
          }}
        >
          {#each columns as column (column.key)}
            <td
              class:num={column.numeric}
              class:mono={column.mono}
              class:table-col-secondary={column.secondary}
            >
              {#if column.key === 'status'}
                <ReferenceStatusBadge active={row.isActive} />
              {:else if column.key === 'name' || column.key === 'title' || column.key === 'label'}
                <span class="cell-primary">{row.cells[column.key] ?? '—'}</span>
                {#if !row.isActive}<span class="inactive-chip">Inactive</span>{/if}
              {:else if column.key === 'schoolYear'}
                <span class="cell-primary">{row.cells.schoolYear ?? '—'}</span>
                {#if row.isCurrent}<span class="current-chip">Current</span>{/if}
              {:else}
                {row.cells[column.key] ?? '—'}
              {/if}
            </td>
          {/each}

          <td class="col-actions">
            <ReferenceRowMenu
              {row}
              onedit={() => {
                const element = document.getElementById(`reference-row-${row.id}`);
                if (element) open(row, element);
              }}
              ondeactivate={() => ondeactivate(row)}
              onactivate={() => onactivate(row)}
            />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .cell-primary {
    font-weight: 500;
  }

  .inactive-chip,
  .current-chip {
    border-radius: var(--radius-badge);
    display: inline-flex;
    font-size: 11px;
    font-weight: 500;
    height: 20px;
    margin-left: 8px;
    padding: 0 6px;
    white-space: nowrap;
  }

  .inactive-chip {
    background: var(--status-neutral-bg);
    color: var(--text-secondary);
  }

  .current-chip {
    background: var(--status-info-bg);
    color: var(--status-info-fg);
  }

  tr.is-inactive td {
    color: var(--text-secondary);
  }

  tr.is-inactive .cell-primary {
    font-weight: 400;
  }

  .col-actions {
    text-align: right;
    width: 64px;
  }

  th.num {
    text-align: right;
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

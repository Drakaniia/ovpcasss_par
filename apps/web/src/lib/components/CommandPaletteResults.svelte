<script lang="ts">
  import { AlertCircle, SearchX } from '@lucide/svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import {
    matchSegments,
    type PalettePage,
    type PaletteReport,
  } from '$lib/palette/palette-entries';

  /**
   * The palette's result column (phase 12 §4). It is presentational: the dialog
   * owns the query, the active option, and the keyboard, so a row only reports
   * the option it stands for.
   */
  let {
    uid,
    listId,
    pages,
    reports,
    activeAt,
    reportsHeading,
    query,
    loading = false,
    failed = false,
    noResults = false,
    onchoose,
    onretry,
  }: {
    uid: string;
    listId: string;
    pages: readonly PalettePage[];
    reports: readonly PaletteReport[];
    activeAt: number;
    reportsHeading: string;
    query: string;
    loading?: boolean;
    failed?: boolean;
    noResults?: boolean;
    onchoose: (option: PalettePage | PaletteReport) => void;
    onretry: () => void;
  } = $props();

  const pagesHeadingId = $derived(`${uid}-pages`);
  const reportsHeadingId = $derived(`${uid}-reports`);

  /** Three placeholder rows read as "results are coming", not as content. */
  const LOADING_ROWS = ['84%', '68%', '76%'];

  /** Rows are pointer targets; a space is a click, not a scroll. */
  function rowKeys(event: KeyboardEvent, option: PalettePage | PaletteReport): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onchoose(option);
  }
</script>

{#snippet marked(text: string)}
  {#each matchSegments(text, query) as segment, index (index)}{#if segment.match}<mark class="hit"
        >{segment.text}</mark
      >{:else}{segment.text}{/if}{/each}
{/snippet}

<div class="results" id={listId} role="listbox" aria-label="Pages and reports">
  {#if pages.length > 0}
    <div role="group" aria-labelledby={pagesHeadingId}>
      <p class="group-title" id={pagesHeadingId}>Pages</p>
      {#each pages as page, index (page.id)}
        <div
          class="option"
          class:is-active={activeAt === index}
          id="{uid}-option-{index}"
          role="option"
          tabindex="-1"
          aria-selected={activeAt === index}
          onclick={() => onchoose(page)}
          onkeydown={(event) => rowKeys(event, page)}
        >
          <span class="option-label">{@render marked(page.label)}</span>
          <span class="option-description">{page.description}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if reports.length > 0}
    <div role="group" aria-labelledby={reportsHeadingId}>
      <p class="group-title" id={reportsHeadingId}>{reportsHeading}</p>
      {#each reports as report, offset (report.id)}
        {@const index = pages.length + offset}
        <div
          class="option option-report"
          class:is-active={activeAt === index}
          id="{uid}-option-{index}"
          role="option"
          tabindex="-1"
          aria-selected={activeAt === index}
          onclick={() => onchoose(report)}
          onkeydown={(event) => rowKeys(event, report)}
        >
          <span class="tracking">{@render marked(report.referenceNo)}</span>
          <span class="option-label">{@render marked(report.title)}</span>
          <StatusBadge status={report.status} />
        </div>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="loading" role="status">
      <span class="sr-only">Searching reports</span>
      {#each LOADING_ROWS as row, index (index)}
        <span class="skeleton-row" aria-hidden="true">
          <span class="skeleton skeleton-tracking"></span>
          <span class="skeleton skeleton-label" style:width={row}></span>
        </span>
      {/each}
    </div>
  {/if}

  {#if failed}
    <div class="state-row is-error" role="alert">
      <AlertCircle size={15} aria-hidden="true" />
      <span class="state-text">Reports could not be searched.</span>
      <button class="btn btn-outline btn-sm retry" type="button" onclick={onretry}>Retry</button>
    </div>
  {/if}

  {#if noResults}
    <div class="state-row">
      <SearchX size={15} aria-hidden="true" />
      <span class="state-text">No pages or reports match “{query}”. Try an AR No. or a name.</span>
    </div>
  {/if}
</div>

<style>
  .results {
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 6px;
  }

  .group-title {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0;
    padding: 8px 10px 4px;
    text-transform: uppercase;
  }

  .option {
    align-items: center;
    border-radius: var(--radius-card);
    cursor: pointer;
    display: flex;
    gap: 12px;
    min-height: 36px;
    padding: 6px 10px;
    transition: background-color 90ms ease-out;
  }

  .option:hover {
    background: var(--row-hover);
  }

  /* Selection is weight as well as fill, so it survives a grayscale screenshot. */
  .option.is-active {
    background: var(--row-selected);
  }

  .option.is-active .option-label {
    font-weight: 500;
  }

  .option-label {
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-description {
    color: var(--text-secondary);
    flex: 0 1 auto;
    font-size: 12px;
    margin-left: auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-report {
    display: grid;
    gap: 10px;
    grid-template-columns: 104px minmax(0, 1fr) auto;
  }

  .tracking {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .hit {
    background: var(--primary-subtle);
    color: inherit;
  }

  .state-row {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 13px;
    gap: 8px;
    margin: 0;
    padding: 12px 10px;
  }

  .state-row.is-error {
    color: var(--status-danger-fg);
  }

  .state-text {
    min-width: 0;
    text-wrap: pretty;
  }

  .retry {
    flex: none;
    margin-left: auto;
  }

  .loading {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0;
  }

  .skeleton-row {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: 92px minmax(0, 1fr);
    min-height: 32px;
    padding: 0 10px;
  }

  .skeleton-tracking {
    height: 10px;
  }

  .skeleton-label {
    height: 10px;
  }
</style>

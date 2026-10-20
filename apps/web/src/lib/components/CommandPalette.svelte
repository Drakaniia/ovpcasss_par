<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { lockScroll, unlockScroll } from '$lib/a11y/scroll-lock';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import {
    filterPages,
    matchSegments,
    palettePages,
    type PalettePage,
    type PaletteReport,
  } from '$lib/palette/palette-entries';
  import { PaletteReportSearch } from '$lib/palette/palette-report-search.svelte';
  import { session } from '$lib/session/session.svelte';

  /**
   * Command palette (phase 12 §4, derived). Pages and reports only: actions are
   * waiting on the open question, so nothing here changes a report. The native
   * modal dialog supplies the top layer, the focus trap, Escape, and focus
   * restore; the input keeps focus while the arrow keys move the active option.
   */
  let { open = $bindable(false) }: { open?: boolean } = $props();

  const search = new PaletteReportSearch();
  const uid = $props.id();
  const listId = `${uid}-list`;
  const pagesHeadingId = `${uid}-pages`;
  const reportsHeadingId = `${uid}-reports`;

  let dialog = $state<HTMLDialogElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let query = $state('');
  let activeIndex = $state(0);

  const pages = $derived(filterPages(palettePages(session.user?.role), query));
  const reports = $derived(search.reports);
  const total = $derived(pages.length + reports.length);
  /** Pages come first, so a report's option sits after every page row. */
  const activeAt = $derived(Math.min(activeIndex, Math.max(total - 1, 0)));
  const activeOptionId = $derived(total === 0 ? undefined : `${uid}-option-${activeAt}`);

  const noResults = $derived(
    query.trim().length > 0 && total === 0 && !search.loading && !search.failed,
  );

  const announcement = $derived.by(() => {
    if (query.trim() === '') return `${pages.length} pages available`;
    if (search.loading) return `${pages.length} pages, searching reports`;
    if (noResults) return 'No pages or reports match';
    return `${pages.length} pages, ${reports.length} reports`;
  });

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      input?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!open) return;
    lockScroll();

    return () => {
      unlockScroll();
      search.reset();
      query = '';
      activeIndex = 0;
    };
  });

  $effect(() => {
    if (!open || total === 0) return;
    document.getElementById(`${uid}-option-${activeAt}`)?.scrollIntoView({ block: 'nearest' });
  });

  function setQuery(value: string) {
    query = value;
    activeIndex = 0;
    search.search(value);
  }

  function move(step: number) {
    if (total === 0) return;
    activeIndex = (activeAt + step + total) % total;
  }

  function choose(option: PalettePage | PaletteReport) {
    open = false;
    void goto(option.href);
  }

  function chooseActive() {
    const option = activeAt < pages.length ? pages[activeAt] : reports[activeAt - pages.length];
    if (option) choose(option);
  }

  /** Rows are pointer targets for the mouse; the arrow keys stay in the input. */
  function optionKeys(event: KeyboardEvent, option: PalettePage | PaletteReport) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    choose(option);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      chooseActive();
    }
  }
</script>

{#snippet marked(text: string)}
  {#each matchSegments(text, query) as segment, index (index)}{#if segment.match}<mark class="hit"
        >{segment.text}</mark
      >{:else}{segment.text}{/if}{/each}
{/snippet}

<dialog
  bind:this={dialog}
  class="dialog palette"
  aria-label="Command palette"
  oncancel={(event) => {
    event.preventDefault();
    open = false;
  }}
  onclick={(event) => {
    // A modal click on the backdrop targets the dialog element itself.
    if (event.target === event.currentTarget) open = false;
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (open = false)}
>
  <div class="search-row">
    <Search size={18} aria-hidden="true" />
    <input
      bind:this={input}
      class="palette-input"
      type="text"
      role="combobox"
      aria-label="Search pages and reports"
      aria-expanded="true"
      aria-controls={listId}
      aria-activedescendant={activeOptionId}
      aria-autocomplete="list"
      autocomplete="off"
      placeholder="Search pages and reports…"
      spellcheck="false"
      value={query}
      oninput={(event) => setQuery(event.currentTarget.value)}
      onkeydown={onKeydown}
    />
  </div>

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
            onclick={() => choose(page)}
            onkeydown={(event) => optionKeys(event, page)}
          >
            <span class="option-label">{@render marked(page.label)}</span>
            <span class="option-description">{page.description}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if reports.length > 0}
      <div role="group" aria-labelledby={reportsHeadingId}>
        <p class="group-title" id={reportsHeadingId}>Reports</p>
        {#each reports as report, offset (report.id)}
          {@const index = pages.length + offset}
          <div
            class="option option-report"
            class:is-active={activeAt === index}
            id="{uid}-option-{index}"
            role="option"
            tabindex="-1"
            aria-selected={activeAt === index}
            onclick={() => choose(report)}
            onkeydown={(event) => optionKeys(event, report)}
          >
            <span class="tracking">{@render marked(report.trackingNumber ?? '—')}</span>
            <span class="option-label">{@render marked(report.title)}</span>
            <StatusBadge status={report.status} />
          </div>
        {/each}
      </div>
    {/if}

    {#if search.loading}
      <p class="state-row">Searching reports…</p>
    {/if}

    {#if search.failed}
      <p class="state-row is-error" role="alert">
        <span>Reports could not be searched.</span>
        <button class="retry" type="button" onclick={() => search.retry()}>Retry</button>
      </p>
    {/if}

    {#if noResults}
      <p class="state-row">No pages or reports match “{query}”.</p>
    {/if}
  </div>

  <p class="sr-only" role="status">{announcement}</p>
</dialog>

<style>
  .palette {
    margin: 12vh auto auto;
    max-width: 560px;
    overflow: hidden;
    padding: 0;
    width: min(560px, calc(100vw - 48px));
  }

  .search-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    display: flex;
    gap: 10px;
    padding: 12px 16px;
  }

  .palette-input {
    background: transparent;
    border: 0;
    color: var(--text-primary);
    flex: 1;
    font-family: var(--font-ui);
    font-size: 15px;
    min-width: 0;
    padding: 2px 0;
  }

  .results {
    max-height: min(52vh, 420px);
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
  }

  .option:hover {
    background: var(--row-hover);
  }

  .option.is-active {
    background: var(--row-selected);
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
    gap: 12px;
    grid-template-columns: 116px minmax(0, 1fr) auto;
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
    padding: 10px;
  }

  .state-row.is-error {
    color: var(--status-danger-fg);
  }

  .retry {
    background: transparent;
    color: var(--link);
    font-size: 13px;
    font-weight: 500;
    padding: 0;
    text-decoration: underline;
  }
</style>

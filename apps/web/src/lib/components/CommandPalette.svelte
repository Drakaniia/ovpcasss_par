<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { lockScroll, unlockScroll } from '$lib/a11y/scroll-lock';
  import CommandPalettePreview from '$lib/components/CommandPalettePreview.svelte';
  import CommandPaletteResults from '$lib/components/CommandPaletteResults.svelte';
  import {
    filterPages,
    palettePages,
    type PalettePage,
    type PaletteReport,
  } from '$lib/palette/palette-entries';
  import { PaletteReportSearch } from '$lib/palette/palette-report-search.svelte';
  import { session } from '$lib/session/session.svelte';

  /**
   * Command palette (phase 12 §4, derived). Pages and reports only: actions are
   * waiting on §14 Q12, so nothing here changes a report.
   *
   * The palette opens on documents, not only navigation: the recent group loads
   * as it appears, and typing replaces it with ranked matches from the scoped
   * search endpoint. The preview pane answers "which one is it?" before Enter.
   * The native modal dialog supplies the top layer, the focus trap, Escape, and
   * focus restore; the input keeps focus while the arrow keys move the active
   * option.
   */
  let { open = $bindable(false) }: { open?: boolean } = $props();

  const search = new PaletteReportSearch();
  const uid = $props.id();
  const listId = `${uid}-list`;

  /** Exit is the enter path reversed; reduced motion closes at once. */
  const CLOSE_MS = 140;

  let dialog = $state<HTMLDialogElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let query = $state('');
  let activeIndex = $state(0);
  let closing = $state(false);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const pages = $derived(filterPages(palettePages(session.user?.role), query));
  const reports = $derived(search.reports);
  const total = $derived(pages.length + reports.length);
  /** Pages come first, so a report's option sits after every page row. */
  const activeAt = $derived(Math.min(activeIndex, Math.max(total - 1, 0)));
  const activeOption = $derived<PalettePage | PaletteReport | null>(
    activeAt < pages.length
      ? (pages[activeAt] ?? null)
      : (reports[activeAt - pages.length] ?? null),
  );
  const activeOptionId = $derived(total === 0 ? undefined : `${uid}-option-${activeAt}`);
  const reportsHeading = $derived(search.recent ? 'Recent' : 'Reports');

  const noResults = $derived(
    query.trim().length >= 2 && total === 0 && !search.loading && !search.failed,
  );

  /** The footer states what the list holds, not what the keys do twice. */
  const summary = $derived.by(() => {
    if (search.failed) return 'Reports unavailable';
    if (search.loading) return 'Searching reports';
    if (total === 0) return query.trim() === '' ? 'No destinations' : 'No matches';
    return total === 1 ? '1 result' : `${total} results`;
  });

  const announcement = $derived.by(() => {
    if (query.trim() === '') return `${pages.length} pages, ${reports.length} recent reports`;
    if (search.loading) return `${pages.length} pages, searching reports`;
    if (noResults) return 'No pages or reports match';
    return `${pages.length} pages, ${reports.length} reports`;
  });

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      input?.focus();
      search.loadRecent();
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
      closing = false;
      clearCloseTimer();
    };
  });

  $effect(() => {
    if (!open || total === 0) return;
    document.getElementById(`${uid}-option-${activeAt}`)?.scrollIntoView({ block: 'nearest' });
  });

  function clearCloseTimer(): void {
    if (closeTimer === undefined) return;
    clearTimeout(closeTimer);
    closeTimer = undefined;
  }

  function closeDelay(): number {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return reduced ? 0 : CLOSE_MS;
  }

  /** Escape, the backdrop, and the close route share one animated exit. */
  function requestClose(): void {
    if (closing) return;
    closing = true;
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      open = false;
    }, closeDelay());
  }

  function setQuery(value: string): void {
    query = value;
    activeIndex = 0;
    search.search(value);
  }

  function move(step: number): void {
    if (total === 0) return;
    activeIndex = (activeAt + step + total) % total;
  }

  /** Opening a result is immediate: navigation is the feedback. */
  function choose(option: PalettePage | PaletteReport): void {
    open = false;
    void goto(option.href);
  }

  function chooseActive(): void {
    const option = activeAt < pages.length ? pages[activeAt] : reports[activeAt - pages.length];
    if (option) choose(option);
  }

  function onKeydown(event: KeyboardEvent): void {
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

<dialog
  bind:this={dialog}
  class="dialog palette"
  class:is-closing={closing}
  aria-label="Command palette"
  oncancel={(event) => {
    event.preventDefault();
    requestClose();
  }}
  onclick={(event) => {
    // A modal click on the backdrop targets the dialog element itself.
    if (event.target === event.currentTarget) requestClose();
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

  <div class="body">
    <CommandPaletteResults
      {uid}
      {listId}
      {pages}
      {reports}
      {activeAt}
      {reportsHeading}
      {query}
      loading={search.loading}
      failed={search.failed}
      {noResults}
      onchoose={choose}
      onretry={() => search.retry()}
    />

    <CommandPalettePreview option={activeOption} recent={search.recent} {query} />
  </div>

  <footer class="footer">
    <span class="summary">{summary}</span>
    <span class="hint"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> move</span>
    <span class="hint"><kbd class="kbd">↵</kbd> open</span>
    <span class="hint"><kbd class="kbd">Esc</kbd> close</span>
  </footer>

  <p class="sr-only" role="status">{announcement}</p>
</dialog>

<style>
  .palette {
    margin: 11vh auto auto;
    max-width: 820px;
    overflow: hidden;
    padding: 0;
    width: min(820px, calc(100vw - 48px));
    /* Arrives as a material: it lifts and clears, it does not merely fade. */
    animation: palette-in 180ms cubic-bezier(0.2, 0, 0, 1);
  }

  .palette.is-closing {
    animation: palette-out 140ms cubic-bezier(0.4, 0, 1, 1) forwards;
  }

  @keyframes palette-in {
    from {
      filter: blur(6px);
      opacity: 0;
      transform: translateY(-8px) scale(0.985);
    }
  }

  @keyframes palette-out {
    to {
      filter: blur(4px);
      opacity: 0;
      transform: translateY(-6px) scale(0.99);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .palette,
    .palette.is-closing {
      animation: none;
    }
  }

  .search-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    display: flex;
    gap: 10px;
    padding: 13px 16px;
    transition: background-color var(--duration-fast) ease;
  }

  /* The field is borderless, so the row carries the focus instead. */
  .search-row:focus-within {
    background: var(--surface-paper);
    color: var(--text-primary);
  }

  .search-row:focus-within :global(svg) {
    color: var(--text-primary);
  }

  .palette-input:focus-visible {
    outline: none;
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

  .palette-input::placeholder {
    color: var(--text-secondary);
  }

  .body {
    display: grid;
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
    max-height: min(56vh, 460px);
    min-height: 260px;
  }

  .footer {
    align-items: center;
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    display: flex;
    font-size: 11.5px;
    gap: 14px;
    padding: 8px 14px;
  }

  .hint {
    align-items: center;
    display: inline-flex;
    gap: 4px;
  }

  /* The count is the one thing that changes, so it leads and the keys recede. */
  .summary {
    margin-right: auto;
  }

  /* Below the two-pane width the preview would squeeze the list: keep the list. */
  @media (max-width: 780px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.palette-preview) {
      display: none;
    }
  }
</style>

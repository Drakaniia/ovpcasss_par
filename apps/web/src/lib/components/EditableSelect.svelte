<script lang="ts">
  import { Check, ChevronDown, Pencil, Plus, Search, X } from '@lucide/svelte';
  import { tick } from 'svelte';

  import {
    initialRowIndex,
    rowActionFor,
    rowsFor,
    stepRowIndex,
    triggerLabel,
    type EditableSelectOption,
  } from './editable-select';
  import EditableSelectRowActions from './EditableSelectRowActions.svelte';

  /**
   * A dropdown that behaves like a list, not a form control (UI spec §4.2).
   * It filters as you type, offers a value the list does not hold, and — when
   * `manage` is supplied — adds, renames, and removes entries in place.
   *
   * Apple's rules the motion follows: the popover grows out of its trigger,
   * the press answers on pointer-down, the highlight moves with the arrow keys,
   * and nothing animates past `prefers-reduced-motion` (base.css shortens it).
   */
  let {
    id,
    label,
    value,
    options,
    placeholder = 'Select…',
    invalid = false,
    describedBy,
    disabled = false,
    /** Short, fixed lists read faster without a search box. */
    searchable = true,
    allowCustom = false,
    manage,
    emptyMessage = 'No entries yet.',
    onchange,
  }: {
    id: string;
    label: string;
    value: string;
    options: readonly EditableSelectOption[];
    placeholder?: string;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
    searchable?: boolean;
    /** Anyone may type a value the list does not hold. */
    allowCustom?: boolean;
    /** Present only where the list itself may be edited; values are the names. */
    manage?: {
      onCreate: (name: string) => Promise<void>;
      onRename: (value: string, name: string) => Promise<void>;
      onRemove: (value: string) => Promise<void>;
    };
    emptyMessage?: string;
    onchange: (value: string) => void;
  } = $props();

  const listId = $derived(`${id}-listbox`);

  let wrapper = $state<HTMLElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  let search = $state<HTMLInputElement | null>(null);
  let popover = $state<HTMLElement | null>(null);
  let list = $state<HTMLElement | null>(null);
  let renameInput = $state<HTMLInputElement | null>(null);

  let open = $state(false);
  let closing = $state(false);
  let above = $state(false);
  let query = $state('');
  let active = $state(0);
  let renaming = $state<string | null>(null);
  let renameText = $state('');
  let busy = $state(false);
  let failure = $state<string | null>(null);
  let closeToken = 0;

  const rows = $derived(
    rowsFor(options, query, { value, canCreate: Boolean(manage), allowCustom }),
  );
  const shown = $derived(triggerLabel(options, value, placeholder));
  const activeRow = $derived(rows[active] ?? null);

  async function show(): Promise<void> {
    if (disabled || busy) return;
    if (open) {
      close(true);
      return;
    }

    closeToken += 1;
    closing = false;
    query = '';
    failure = null;
    renaming = null;
    active = initialRowIndex(rowsFor(options, '', { value, canCreate: false, allowCustom: false }));
    open = true;

    await tick();
    above = flips();
    await tick();
    if (searchable) search?.focus();
    else list?.focus();
  }

  /** Below the trigger unless that would overflow and there is room above it. */
  function flips(): boolean {
    const rect = trigger?.getBoundingClientRect();
    if (!rect) return false;
    const height = popover?.offsetHeight || 280;
    const below = rect.bottom + 6 + height;
    return below > window.innerHeight - 8 && rect.top - 6 - height > 8;
  }

  function close(restoreFocus = false): void {
    if (!open || closing) return;

    closing = true;
    renaming = null;
    failure = null;
    if (restoreFocus) trigger?.focus();

    const token = ++closeToken;
    window.setTimeout(() => {
      if (token !== closeToken) return;
      open = false;
      closing = false;
    }, 120);
  }

  function message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  async function choose(row: (typeof rows)[number]): Promise<void> {
    if (row.kind === 'option') {
      onchange(row.value);
      close(true);
      return;
    }

    if (row.kind === 'custom') {
      onchange(row.name);
      close(true);
      return;
    }

    if (!manage || busy) return;
    busy = true;
    failure = null;
    try {
      await manage.onCreate(row.name);
      onchange(row.name);
      close(true);
    } catch (error) {
      failure = message(error, 'The entry was not added. Try again.');
    } finally {
      busy = false;
    }
  }

  async function commitRename(): Promise<void> {
    const target = renaming;
    const name = renameText.trim();
    if (!manage || !target || busy || !name) return;

    busy = true;
    failure = null;
    try {
      await manage.onRename(target, name);
      if (value === target) onchange(name);
      renaming = null;
      query = '';
      active = 0;
      focusList();
    } catch (error) {
      failure = message(error, 'The entry was not renamed. Try again.');
    } finally {
      busy = false;
    }
  }

  /** Removes the entry the control belongs to, never whichever row is lit now. */
  async function removeEntry(target: { value: string }): Promise<void> {
    if (!manage || busy) return;

    busy = true;
    failure = null;
    try {
      await manage.onRemove(target.value);
      if (renaming === target.value) renaming = null;
      query = '';
      active = 0;
      focusList();
    } catch (error) {
      failure = message(error, 'The entry was not removed. Try again.');
    } finally {
      busy = false;
    }
  }

  function startRename(option: { value: string; name?: string }): void {
    if (!manage || busy) return;

    const index = rows.findIndex((row) => row.kind === 'option' && row.value === option.value);
    if (index >= 0) active = index;
    renaming = option.value;
    renameText = option.name ?? option.value;
    failure = null;
    void tick().then(() => {
      renameInput?.focus();
      renameInput?.select();
    });
  }

  /** Escape leaves the popover open and hands the list back its highlight. */
  function cancelRename(): void {
    renaming = null;
    failure = null;
    focusList();
  }

  function focusList(): void {
    if (searchable) search?.focus();
    else list?.focus();
  }

  /** A row's own controls own Enter, the arrow keys, and the caret while focused. */
  function inRowControl(event: KeyboardEvent): boolean {
    return Boolean((event.target as Element | null)?.closest?.('[data-row-control]'));
  }

  function walk(event: KeyboardEvent): void {
    if (inRowControl(event)) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (renaming) cancelRename();
      else close(true);
      return;
    }

    const highlight = rows[active] ?? null;
    const action = manage ? rowActionFor(highlight, event) : null;
    if (action && highlight?.kind === 'option') {
      event.preventDefault();
      if (action === 'rename') startRename(highlight);
      else void removeEntry(highlight);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        active = stepRowIndex(active, rows.length, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        active = stepRowIndex(active, rows.length, -1);
        break;
      case 'Home':
        event.preventDefault();
        active = rows.length > 0 ? 0 : -1;
        break;
      case 'End':
        event.preventDefault();
        active = rows.length - 1;
        break;
      case 'Enter': {
        const row = rows[active];
        if (!row) return;
        event.preventDefault();
        void choose(row);
        break;
      }
      case 'Escape':
        event.preventDefault();
        if (renaming) cancelRename();
        else close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  }

  // The highlight follows the keyboard even when the list is longer than the box.
  $effect(() => {
    const index = active;
    if (!open) return;
    void tick().then(() => {
      list?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({
        block: 'nearest',
      });
    });
  });

  $effect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (!wrapper?.contains(event.target as Node)) close(false);
    };

    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  });
</script>

<div class="editable-select" bind:this={wrapper}>
  <button
    {id}
    class="trigger"
    class:is-placeholder={!value}
    type="button"
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={open ? listId : undefined}
    data-invalid={invalid ? 'true' : undefined}
    aria-describedby={describedBy}
    bind:this={trigger}
    onclick={show}
  >
    <span class="value">{shown}</span>
    <span class="chevron"><ChevronDown size={15} aria-hidden="true" /></span>
  </button>

  {#if open}
    <div
      class="popover"
      class:is-above={above}
      class:is-closing={closing}
      bind:this={popover}
      role="presentation"
      onkeydown={walk}
    >
      {#if searchable}
        <div class="search-row">
          <span class="search-icon"><Search size={14} aria-hidden="true" /></span>
          <input
            class="search"
            type="text"
            autocomplete="off"
            spellcheck="false"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-labelledby={`${id}-search-label`}
            aria-activedescendant={activeRow ? `${id}-row-${active}` : undefined}
            placeholder={`Search ${label.toLowerCase()}`}
            bind:this={search}
            bind:value={query}
            oninput={() => (active = 0)}
          />
          <span class="visually-hidden" id={`${id}-search-label`}>{label}</span>
        </div>
      {/if}

      <div class="list" bind:this={list} tabindex="-1" role="presentation">
        <ul id={listId} role="listbox" aria-label={label}>
          {#if rows.length === 0}
            <li class="empty">{emptyMessage}</li>
          {/if}

          {#each rows as row, index (row.kind === 'option' ? row.value : row.kind)}
            <!-- The listbox owns the keys; a row click is the pointer shortcut for the same choice. -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              id={`${id}-row-${index}`}
              data-index={index}
              class="row"
              class:is-active={index === active}
              role="option"
              aria-selected={row.kind === 'option' ? row.selected : false}
              onmouseenter={() => (active = index)}
              onclick={() => void choose(row)}
            >
              {#if row.kind === 'option' && renaming === row.value}
                <form
                  class="row-rename"
                  data-row-control="true"
                  onsubmit={(event) => {
                    event.preventDefault();
                    void commitRename();
                  }}
                >
                  <input
                    class="rename-input"
                    bind:this={renameInput}
                    bind:value={renameText}
                    type="text"
                    maxlength="120"
                    autocomplete="off"
                    aria-label="New name for {row.name ?? row.value}"
                    disabled={busy}
                    onclick={(event) => event.stopPropagation()}
                  />
                  <button
                    class="row-action"
                    type="submit"
                    aria-label="Save name"
                    disabled={busy || !renameText.trim()}
                    onclick={(event) => event.stopPropagation()}
                  >
                    <Check size={14} aria-hidden="true" />
                  </button>
                  <button
                    class="row-action"
                    type="button"
                    aria-label="Cancel rename"
                    disabled={busy}
                    onclick={(event) => {
                      event.stopPropagation();
                      cancelRename();
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </form>
              {:else if row.kind === 'option'}
                <span class="option-label">{row.label}</span>
                {#if row.selected}
                  <span class="check"><Check size={14} aria-hidden="true" /></span>
                {/if}
                {#if manage}
                  <EditableSelectRowActions
                    name={row.value}
                    disabled={busy}
                    onrename={() => startRename(row)}
                    onremove={() => void removeEntry(row)}
                  />
                {/if}
              {:else}
                <span class="create-icon">
                  {#if row.kind === 'create'}
                    <Plus size={14} aria-hidden="true" />
                  {:else}
                    <Pencil size={13} aria-hidden="true" />
                  {/if}
                </span>
                <span class="option-label">{row.label}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      {#if failure}
        <p class="failure" role="alert">{failure}</p>
      {/if}

      {#if manage}
        <p class="hint">
          Edits apply to the official list for everyone. F2 rename · Shift+Delete remove.
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editable-select {
    position: relative;
  }

  .trigger {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: flex;
    font-family: var(--font-ui);
    font-size: 14px;
    gap: 8px;
    justify-content: space-between;
    min-height: 32px;
    padding: 6px 10px;
    text-align: left;
    transition:
      border-color 120ms ease,
      box-shadow 160ms ease,
      transform 90ms ease-out;
    width: 100%;
  }

  .trigger:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--text-primary) 22%, var(--border));
  }

  .trigger:active:not(:disabled) {
    transform: scale(0.995);
  }

  .trigger[aria-expanded='true'] {
    border-color: var(--focus-ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 16%, transparent);
  }

  /* The field's error text is the announcement; the edge carries the same state. */
  .trigger[data-invalid='true'] {
    border-color: var(--status-danger-fg);
  }

  .trigger:disabled {
    background: var(--surface-page);
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .is-placeholder .value {
    color: var(--text-disabled);
  }

  .chevron {
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .trigger[aria-expanded='true'] .chevron {
    transform: rotate(180deg);
  }

  .popover {
    animation: pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
    backdrop-filter: blur(18px) saturate(150%);
    background: color-mix(in srgb, var(--surface-card) 94%, transparent);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow-raised);
    display: flex;
    flex-direction: column;
    left: 0;
    min-width: 100%;
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    transform-origin: top center;
    z-index: 60;
  }

  .popover.is-above {
    bottom: calc(100% + 6px);
    top: auto;
    transform-origin: bottom center;
  }

  .popover.is-closing {
    animation: pop-out 120ms cubic-bezier(0.4, 0, 1, 1) forwards;
    pointer-events: none;
  }

  @keyframes pop-in {
    from {
      filter: blur(2px);
      opacity: 0;
      transform: translateY(-4px) scale(0.97);
    }
  }

  @keyframes pop-out {
    to {
      opacity: 0;
      transform: translateY(-3px) scale(0.98);
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .popover {
      backdrop-filter: none;
      background: var(--surface-card);
    }
  }

  .search-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 6px;
    padding: 6px 8px;
  }

  .search-icon {
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
  }

  .search {
    background: transparent;
    border: 0;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    min-height: 24px;
    outline: none;
    padding: 2px 0;
    width: 100%;
  }

  .search::placeholder {
    color: var(--text-disabled);
  }

  .list {
    max-height: 244px;
    outline: none;
    overscroll-behavior: contain;
    overflow-y: auto;
    padding: 4px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .row {
    align-items: center;
    border-radius: 6px;
    color: var(--text-primary);
    cursor: default;
    display: flex;
    font-size: 13px;
    gap: 8px;
    min-height: 30px;
    padding: 5px 8px;
  }

  .row.is-active {
    background: var(--primary-subtle);
  }

  .option-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check {
    color: var(--primary);
    display: inline-flex;
    flex: none;
    margin-left: auto;
  }

  .create-icon {
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 12px;
    padding: 8px 9px;
  }

  .failure {
    border-top: 1px solid var(--border);
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 0;
    padding: 8px 10px;
  }

  /* The controls stay in the DOM so a row never changes height; only the reveal
     moves, and it moves without layout. */
  .row :global(.row-actions) {
    opacity: 0;
    transform: translateX(2px);
    transition:
      opacity 120ms var(--ease-standard),
      transform 120ms var(--ease-standard);
  }

  .row:hover :global(.row-actions),
  .row.is-active :global(.row-actions),
  .row:focus-within :global(.row-actions) {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .row :global(.row-actions) {
      transform: none;
      transition: opacity 120ms var(--ease-standard);
    }
  }

  .row-rename {
    align-items: center;
    display: flex;
    gap: 4px;
    width: 100%;
  }

  .rename-input {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text-primary);
    flex: 1;
    font-family: var(--font-ui);
    font-size: 13px;
    height: 22px;
    margin-block: -1px;
    min-width: 0;
    padding: 0 6px;
  }

  .rename-input:focus-visible {
    border-color: var(--focus-ring);
    outline: none;
  }

  .row-action {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 5px;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 26px;
    justify-content: center;
    margin-block: -3px;
    width: 26px;
  }

  .row-action:hover:not(:disabled),
  .row-action:focus-visible {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .row-action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .hint {
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 11px;
    margin: 0;
    padding: 8px 10px;
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

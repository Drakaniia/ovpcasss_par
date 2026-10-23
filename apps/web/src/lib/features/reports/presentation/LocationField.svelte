<script lang="ts">
  import type { LocationSuggestion } from '@par/shared';
  import { SvelteMap } from 'svelte/reactivity';

  import { api } from '$lib/api/client';
  import { rankLocations } from '../application/location-suggestions';

  /**
   * Location field (bug phase 04 §3.1): a combobox, not a picker. Free text is
   * still the value that is saved; the list only offers venues the office has
   * already used, scoped to what this account may read.
   */
  let {
    id,
    label,
    value,
    invalid = false,
    describedBy,
    disabled = false,
    onchange,
  }: {
    id: string;
    label: string;
    value: string;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
    onchange: (value: string) => void;
  } = $props();

  const listId = $derived(`${id}-suggestions`);
  const cache = new SvelteMap<string, LocationSuggestion[]>();

  let wrapper = $state<HTMLElement | null>(null);
  let open = $state(false);
  let active = $state(-1);
  let items = $state<LocationSuggestion[]>([]);
  let announcement = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const visible = $derived(open && items.length > 0);
  const activeId = $derived(active >= 0 ? `${id}-option-${active}` : undefined);

  function load(query: string): void {
    clearTimeout(timer);
    timer = setTimeout(() => void fetchSuggestions(query), 150);
  }

  async function fetchSuggestions(query: string): Promise<void> {
    const key = query.trim();
    const cached = cache.get(key);

    if (cached) {
      items = cached;
      active = -1;
      announcement = countText(cached.length);
      return;
    }

    controller?.abort();
    controller = new AbortController();

    try {
      const response = await api.locations.suggest({ q: key || undefined, limit: 8 });
      if (controller.signal.aborted) return;

      const ranked = rankLocations(response.items, key);
      cache.set(key, ranked);
      items = ranked;
      active = -1;
      announcement = countText(ranked.length);
    } catch {
      // The list never blocks the field: a failure leaves plain free text.
      items = [];
      active = -1;
      announcement = '';
    }
  }

  function countText(count: number): string {
    if (count === 0) return '';
    return count === 1 ? '1 suggestion available' : `${count} suggestions available`;
  }

  function show(): void {
    if (disabled) return;
    open = true;
    void fetchSuggestions(value);
  }

  function choose(suggestion: LocationSuggestion): void {
    onchange(suggestion.location);
    open = false;
    active = -1;
    document.getElementById(id)?.focus();
  }

  function close(): void {
    open = false;
    active = -1;
  }

  function onInput(event: Event): void {
    const next = (event.currentTarget as HTMLInputElement).value;
    onchange(next);
    open = true;
    load(next);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      if (!open) show();
      if (items.length === 0) return;
      event.preventDefault();
      active = (active + 1) % items.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!open || items.length === 0) return;
      event.preventDefault();
      active = (active - 1 + items.length) % items.length;
      return;
    }

    if (event.key === 'Enter') {
      if (!open || active < 0) return;
      const suggestion = items[active];
      if (!suggestion) return;
      event.preventDefault();
      choose(suggestion);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  }

  function onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget;
    if (related instanceof Node && wrapper?.contains(related)) return;
    close();
  }

  $effect(() => () => {
    clearTimeout(timer);
    controller?.abort();
  });
</script>

<div class="location-field" bind:this={wrapper}>
  <input
    {id}
    class="input"
    aria-label={label}
    type="text"
    autocomplete="off"
    spellcheck="false"
    maxlength="300"
    placeholder="Barangay, municipality, or venue"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={visible}
    aria-controls={visible ? listId : undefined}
    aria-activedescendant={visible ? activeId : undefined}
    aria-invalid={invalid ? 'true' : undefined}
    aria-describedby={describedBy}
    {disabled}
    {value}
    onfocus={show}
    oninput={onInput}
    onkeydown={onKeydown}
    onblur={onFocusOut}
  />

  {#if visible}
    <ul class="suggestions" {id} role="listbox" aria-label="Previously used locations">
      {#each items as suggestion, index (suggestion.location)}
        <li
          id="{id}-option-{index}"
          class="option"
          class:is-active={index === active}
          role="option"
          aria-selected={index === active}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => choose(suggestion)}
        >
          {suggestion.location}
        </li>
      {/each}
    </ul>
  {/if}

  <span class="visually-hidden" role="status" aria-live="polite">{announcement}</span>
</div>

<style>
  .location-field {
    position: relative;
  }

  .suggestions {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-raised);
    left: 0;
    list-style: none;
    margin: 4px 0 0;
    max-height: 232px;
    overflow-y: auto;
    padding: 4px;
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 40;
  }

  .option {
    border-radius: 6px;
    color: var(--text-primary);
    cursor: default;
    font-size: 13px;
    overflow: hidden;
    padding: 7px 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option:hover,
  .option.is-active {
    background: var(--primary-subtle);
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

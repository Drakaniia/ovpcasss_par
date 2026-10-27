<script lang="ts">
  import {
    HIDDEN_LOCATIONS_LIMIT,
    LOCATION_MAX_LENGTH,
    type LocationSuggestion,
    type LocationSuggestionsResponse,
  } from '@par/shared';
  import { Trash2 } from '@lucide/svelte';
  import { SvelteMap } from 'svelte/reactivity';

  import { api } from '$lib/api/client';
  import {
    loadPreferences,
    preferencesState,
    savePreferences,
  } from '$lib/features/preferences/application/preferences.svelte';
  import {
    mergeSuggestions,
    normalizeLocation,
    rankLocations,
    withoutHiddenLocations,
  } from '../application/location-suggestions';

  /**
   * Location field (bug phase 04 §3.1-§3.2): a combobox, not a picker. Free text
   * is still the value that is saved. The list leads with venues the office has
   * already used and, once the query is worth a lookup, adds addresses from the
   * Worker's provider proxy. The provider is never called from here.
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

  /** Shorter queries would geocode half the province. */
  const ADDRESS_MIN_QUERY = 4;

  /** The address half is a convenience: its failure leaves the office list. */
  const emptyResponse: LocationSuggestionsResponse = { items: [] };

  const listId = $derived(`${id}-suggestions`);
  const cache = new SvelteMap<string, LocationSuggestion[]>();

  let wrapper = $state<HTMLElement | null>(null);
  let open = $state(false);
  let active = $state(-1);
  let items = $state<LocationSuggestion[]>([]);
  let announcement = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  /** A row the account removed stays gone on every shell, so it lives on the API. */
  const hidden = $derived(preferencesState.value.hiddenLocations ?? []);
  const rows = $derived(withoutHiddenLocations(items, hidden));

  const visible = $derived(open && rows.length > 0);
  const activeId = $derived(active >= 0 ? `${id}-option-${active}` : undefined);

  /**
   * Forgets one history row; the address rows are the provider's, not ours. The
   * record is read first so a removal never writes over the rest of the list.
   */
  async function hide(location: string): Promise<void> {
    await loadPreferences();

    const key = normalizeLocation(location).toLowerCase();
    const current = preferencesState.value.hiddenLocations ?? [];
    if (current.some((value) => normalizeLocation(value).toLowerCase() === key)) return;

    active = -1;
    savePreferences({
      hiddenLocations: [...current, normalizeLocation(location)].slice(-HIDDEN_LOCATIONS_LIMIT),
    });
  }

  function load(query: string): void {
    clearTimeout(timer);
    timer = setTimeout(() => void fetchSuggestions(query), 250);
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
    const current = new AbortController();
    controller = current;

    const officeRequest = api.locations
      .suggest({ q: key || undefined, limit: 8 })
      .catch(() => emptyResponse);
    const addressRequest =
      key.length >= ADDRESS_MIN_QUERY
        ? api.locations.addresses({ q: key, limit: 8 }).catch(() => emptyResponse)
        : Promise.resolve(emptyResponse);

    try {
      // The office's own history is local and instant; the provider can take a
      // second, so its rows merge into a list that is already on screen rather
      // than holding the whole list back.
      const office = await officeRequest;
      if (current.signal.aborted) return;

      const ranked = rankLocations(office.items, key);
      items = ranked;
      active = -1;
      announcement = countText(ranked.length);

      const address = await addressRequest;
      if (current.signal.aborted) return;

      // Office history leads; an address never displaces a venue already used.
      const merged = mergeSuggestions(ranked, address.items);
      cache.set(key, merged);
      items = merged;
      active = -1;
      announcement = countText(merged.length);
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
      if (rows.length === 0) return;
      event.preventDefault();
      active = (active + 1) % rows.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!open || rows.length === 0) return;
      event.preventDefault();
      active = (active - 1 + rows.length) % rows.length;
      return;
    }

    if (event.key === 'Enter') {
      if (!open || active < 0) return;
      const suggestion = rows[active];
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
    maxlength={LOCATION_MAX_LENGTH}
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
    <ul class="suggestions" {id} role="listbox" aria-label="Location suggestions">
      {#each rows as suggestion, index (suggestion.location)}
        <li
          id="{id}-option-{index}"
          class="option"
          class:is-active={index === active}
          role="option"
          aria-selected={index === active}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => choose(suggestion)}
        >
          <span class="label">{suggestion.location}</span>
          {#if suggestion.source === 'address'}
            <span class="source">Address</span>
          {:else}
            <button
              class="remove"
              type="button"
              tabindex="-1"
              aria-label="Remove {suggestion.location} from history"
              onclick={(event) => {
                event.stopPropagation();
                void hide(suggestion.location);
              }}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          {/if}
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
    align-items: baseline;
    border-radius: 6px;
    color: var(--text-primary);
    cursor: default;
    display: flex;
    font-size: 13px;
    gap: 8px;
    padding: 7px 8px;
  }

  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Which half of the list a row came from; the value itself is unchanged. */
  .source {
    color: var(--text-secondary);
    flex: none;
    font-size: 11px;
    margin-left: auto;
  }

  .option:hover,
  .option.is-active {
    background: var(--primary-subtle);
  }

  /* Out of the tab order like the reference lists: the option stays one stop. */
  .remove {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 5px;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 22px;
    justify-content: center;
    margin: -3px -4px -3px auto;
    width: 22px;
  }

  .remove:hover,
  .remove:focus-visible {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
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

<script lang="ts">
  import { CalendarDays } from '@lucide/svelte';
  import { tick, untrack } from 'svelte';

  import { parseIsoDate } from '$lib/format/calendar';
  import { formatDate, parseTypedDate } from '$lib/format/datetime';

  import CalendarPopover from './CalendarPopover.svelte';

  let {
    id,
    label,
    value,
    text,
    invalid = false,
    describedBy,
    disabled = false,
    dense = false,
    revertInvalid = true,
    placeholder = 'DD MMM YYYY',
    onchange,
    ontext,
    onblur,
  }: {
    id: string;
    label?: string;
    value: string;
    text?: string;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
    dense?: boolean;
    revertInvalid?: boolean;
    placeholder?: string;
    onchange: (iso: string) => void;
    ontext?: (text: string) => void;
    onblur?: () => void;
  } = $props();

  let wrapper = $state<HTMLElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  let popover = $state<HTMLElement | null>(null);
  let open = $state(false);
  let editing = $state(false);
  let typed = $state(untrack(() => text ?? displayDate(value)));
  let position = $state({ top: 0, left: 0 });

  const inputValue = $derived(text !== undefined ? text : typed);
  const calendarId = $derived(`${id}-calendar`);

  $effect(() => {
    if (text !== undefined) return;
    const next = displayDate(value);
    if (!editing && untrack(() => typed) !== next) typed = next;
  });

  $effect(() => {
    if (!open) return;

    let active = true;
    const update = () => {
      if (active) place();
    };

    void tick().then(update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      active = false;
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  });

  function displayDate(iso: string): string {
    return parseIsoDate(iso) ? formatDate(iso) : '';
  }

  function place(): void {
    const rect = trigger?.getBoundingClientRect();
    if (!rect) return;

    const width = 288;
    const height = popover?.offsetHeight ?? 0;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const left = Math.min(Math.max(8, rect.left), maxLeft);
    let top = rect.bottom + 4;

    if (height > 0 && top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height - 4);
    }

    position = { top, left };
  }

  function close(restoreFocus = false): void {
    open = false;
    if (restoreFocus) trigger?.focus();
  }

  function toggle(): void {
    if (disabled) return;
    if (open) {
      close();
      return;
    }
    open = true;
  }

  function choose(iso: string): void {
    const formatted = formatDate(iso);
    editing = false;
    if (text !== undefined) ontext?.(formatted);
    else typed = formatted;
    if (iso !== value) onchange(iso);
    close();
    input?.focus();
  }

  function commit(): void {
    const current = inputValue.trim();
    editing = false;

    if (!current) {
      if (value) onchange('');
      if (text === undefined) typed = '';
      onblur?.();
      return;
    }

    const iso = parseTypedDate(current);
    if (!iso) {
      if (revertInvalid) {
        if (text === undefined) typed = displayDate(value);
      } else if (value) {
        onchange('');
      }
      onblur?.();
      return;
    }

    const formatted = formatDate(iso);
    if (text === undefined) typed = formatted;
    else if (formatted !== text) ontext?.(formatted);
    if (iso !== value) onchange(iso);
    onblur?.();
  }

  function handleInput(event: Event): void {
    const next = (event.currentTarget as HTMLInputElement).value;
    editing = true;
    if (text !== undefined) ontext?.(next);
    else typed = next;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      commit();
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    }
  }

  function closeOnOutside(event: MouseEvent): void {
    if (open && wrapper && !wrapper.contains(event.target as Node)) close();
  }
</script>

<svelte:window onclick={closeOnOutside} />

<div class="date-picker" class:is-dense={dense} bind:this={wrapper}>
  <div class="date-row">
    <input
      {id}
      class="input date-input"
      type="text"
      inputmode="text"
      autocomplete="off"
      {placeholder}
      value={inputValue}
      {disabled}
      aria-invalid={invalid ? 'true' : undefined}
      aria-describedby={describedBy}
      bind:this={input}
      oninput={handleInput}
      onblur={commit}
      onkeydown={handleKeydown}
    />
    <button
      class="calendar-button"
      type="button"
      aria-label={label ? `Choose ${label.toLowerCase()}` : 'Choose a date'}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={calendarId}
      {disabled}
      bind:this={trigger}
      onclick={toggle}
    >
      <CalendarDays size={16} aria-hidden="true" />
    </button>
  </div>

  {#if open}
    <div
      class="popover-anchor"
      style:top="{position.top}px"
      style:left="{position.left}px"
      bind:this={popover}
    >
      <CalendarPopover
        id={calendarId}
        {label}
        {value}
        onchoose={choose}
        onclose={() => close(true)}
      />
    </div>
  {/if}
</div>

<style>
  .date-picker {
    flex: 1;
    min-width: 0;
    position: relative;
  }

  .date-row {
    display: flex;
    gap: 4px;
  }

  .date-input {
    flex: 1;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    width: auto;
  }

  .calendar-button {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .calendar-button:hover:not(:disabled) {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .date-picker.is-dense .date-input {
    font-size: 12px;
    min-height: 36px;
    padding: 0 10px;
  }

  .date-picker.is-dense .calendar-button {
    height: 36px;
    width: 36px;
  }

  .popover-anchor {
    animation: date-pop 120ms cubic-bezier(0.22, 1, 0.36, 1);
    position: fixed;
    transform-origin: top left;
    width: 288px;
    z-index: 60;
  }

  @keyframes date-pop {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
  }
</style>

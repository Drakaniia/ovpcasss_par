<script lang="ts">
  import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import { formatDate, parseTypedDate } from '$lib/format/datetime';

  import WizardField from './WizardField.svelte';

  /**
   * Dates are typed as `DD MMM YYYY` (UI spec §7.5) with a calendar popover for
   * pointer use. The parent holds both the typed text and the ISO value so a
   * half-typed date is never lost.
   */
  let {
    id,
    label,
    value,
    text,
    error,
    optional = false,
    flagged = false,
    disabled = false,
    ontext,
    onchange,
  }: {
    id: string;
    label: string;
    value: string;
    text: string;
    error?: string;
    optional?: boolean;
    flagged?: boolean;
    disabled?: boolean;
    ontext: (text: string) => void;
    onchange: (iso: string) => void;
  } = $props();

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let wrapper = $state<HTMLElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  let open = $state(false);

  function pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  function today(): { year: number; month: number; day: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }

  function isoParts(iso: string): { year: number; month: number; day: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  }

  let viewYear = $state(untrack(() => isoParts(value)?.year ?? today().year));
  let viewMonth = $state(untrack(() => isoParts(value)?.month ?? today().month));

  const monthLabel = $derived(
    new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(viewYear, viewMonth, 1)),
    ),
  );

  const weeks = $derived.by(() => {
    const firstWeekday = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: Array<Array<number | null>> = [];
    for (let index = 0; index < cells.length; index += 7) rows.push(cells.slice(index, index + 7));
    return rows;
  });

  function isoFor(day: number): string {
    return `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
  }

  function toggle(): void {
    if (disabled) return;
    if (open) {
      open = false;
      return;
    }
    const parts = isoParts(value) ?? today();
    viewYear = parts.year;
    viewMonth = parts.month;
    open = true;
  }

  function shiftMonth(delta: number): void {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    viewYear = next.getUTCFullYear();
    viewMonth = next.getUTCMonth();
  }

  function choose(day: number): void {
    const iso = isoFor(day);
    onchange(iso);
    ontext(formatDate(iso));
    open = false;
    input?.focus();
  }

  function commitText(): void {
    const trimmed = text.trim();
    if (!trimmed) {
      if (value) onchange('');
      return;
    }

    const iso = parseTypedDate(trimmed);
    if (!iso) {
      // The displayed text is the value; an unparseable date clears the ISO so
      // validation cannot pass on a stale date behind the text.
      if (value) onchange('');
      return;
    }

    ontext(formatDate(iso));
    if (iso !== value) onchange(iso);
  }

  function closeOnOutside(event: MouseEvent): void {
    if (open && wrapper && !wrapper.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onclick={closeOnOutside} />

<WizardField {id} {label} {error} {optional} {flagged} hint="DD MMM YYYY">
  {#snippet children({ describedBy, invalid })}
    <div class="date-field" bind:this={wrapper}>
      <div class="date-row">
        <input
          {id}
          class="input date-input"
          type="text"
          inputmode="text"
          autocomplete="off"
          placeholder="DD MMM YYYY"
          value={text}
          {disabled}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          bind:this={input}
          oninput={(event) => ontext(event.currentTarget.value)}
          onblur={commitText}
        />
        <button
          class="calendar-button"
          type="button"
          aria-label="Choose a date"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="{id}-calendar"
          {disabled}
          bind:this={trigger}
          onclick={toggle}
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
      </div>

      {#if open}
        <div
          class="popover"
          id="{id}-calendar"
          role="dialog"
          tabindex="-1"
          aria-label="Choose a date"
          onkeydown={(event) => {
            if (event.key !== 'Escape') return;
            open = false;
            trigger?.focus();
          }}
        >
          <div class="popover-head">
            <button type="button" aria-label="Previous month" onclick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span class="month-label" aria-live="polite">{monthLabel}</span>
            <button type="button" aria-label="Next month" onclick={() => shiftMonth(1)}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div class="grid-head" aria-hidden="true">
            {#each WEEKDAYS as weekday (weekday)}
              <span>{weekday}</span>
            {/each}
          </div>

          {#each weeks as week, index (index)}
            <div class="grid-row">
              {#each week as day, cellIndex (cellIndex)}
                {#if day === null}
                  <span class="day-gap" aria-hidden="true"></span>
                {:else}
                  <button
                    class="day"
                    class:is-selected={value === isoFor(day)}
                    type="button"
                    onclick={() => choose(day)}
                  >
                    {day}
                  </button>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}
</WizardField>

<style>
  .date-field {
    position: relative;
  }

  .date-row {
    display: flex;
    gap: 4px;
  }

  .date-input {
    font-variant-numeric: tabular-nums;
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

  .popover {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-raised);
    margin-top: 4px;
    padding: 8px;
    position: absolute;
    width: 232px;
    z-index: 30;
  }

  .popover-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .popover-head button {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .popover-head button:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .month-label {
    font-size: 13px;
    font-weight: 500;
  }

  .grid-head,
  .grid-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }

  .grid-head span {
    color: var(--text-secondary);
    font-size: 11px;
    padding: 4px 0;
    text-align: center;
  }

  .day,
  .day-gap {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: inline-flex;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    height: 28px;
    justify-content: center;
  }

  .day:hover {
    background: var(--surface-page);
  }

  .day.is-selected {
    background: var(--primary);
    color: var(--on-primary);
  }
</style>

<script lang="ts">
  import { ChevronDown, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { onMount, tick, untrack } from 'svelte';

  import {
    addDays,
    addMonths,
    endOfWeekIso,
    isoDate,
    monthGrid,
    monthLabel,
    parseIsoDate,
    startOfWeekIso,
    todayIso,
  } from '$lib/format/calendar';
  import { formatLongDate } from '$lib/format/datetime';

  let {
    id,
    label,
    value,
    onchoose,
    onclose,
  }: {
    id: string;
    label?: string;
    value: string;
    onchoose: (iso: string) => void;
    onclose: () => void;
  } = $props();

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = todayIso();

  const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2026, month, 1)),
    ),
  );

  let grid = $state<HTMLElement | null>(null);
  let monthButton = $state<HTMLButtonElement | null>(null);
  /** The month/year panel replaces the day grid while it is open. */
  let jumping = $state(false);
  let focusIso = $state(untrack(() => (parseIsoDate(value) ? value : today)));
  let view = $state(
    untrack(() => {
      const parts = parseIsoDate(value) ?? parseIsoDate(today)!;
      return { year: parts.year, month: parts.month };
    }),
  );

  const rows = $derived.by(() => {
    const cells = monthGrid(view.year, view.month).map((iso) => {
      const parts = parseIsoDate(iso);
      return { iso, day: parts?.day ?? 1, inMonth: parts?.month === view.month };
    });

    return Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  });

  function focusButton(iso: string): void {
    grid?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus();
  }

  function setFocus(iso: string, moveFocus = true): void {
    const parts = parseIsoDate(iso);
    if (!parts) return;

    focusIso = iso;
    view = { year: parts.year, month: parts.month };
    if (moveFocus) void tick().then(() => focusButton(iso));
  }

  function shiftMonth(delta: number): void {
    const current = parseIsoDate(focusIso) ?? parseIsoDate(today)!;
    const target = parseIsoDate(addMonths(isoDate({ ...view, day: 1 }), delta))!;
    const lastDay = new Date(Date.UTC(target.year, target.month + 1, 0)).getUTCDate();

    setFocus(isoDate({ ...target, day: Math.min(current.day, lastDay) }), false);
  }

  /** The day the current focus sits on, clamped into the month being shown. */
  function dayIn(year: number, month: number): string {
    const current = parseIsoDate(focusIso) ?? parseIsoDate(today)!;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return isoDate({ year, month, day: Math.min(current.day, lastDay) });
  }

  function jumpToMonth(month: number): void {
    const iso = dayIn(view.year, month);
    jumping = false;
    setFocus(iso);
  }

  function shiftYear(delta: number): void {
    setFocus(dayIn(view.year + delta, view.month), false);
  }

  function toggleJump(): void {
    jumping = !jumping;
    if (!jumping) void tick().then(() => monthButton?.focus());
  }

  /** The panel keeps focus on its own buttons; Escape returns to the label. */
  function handleJumpKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      shiftYear(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      shiftYear(1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      jumping = false;
      void tick().then(() => monthButton?.focus());
    }
  }

  function choose(iso: string): void {
    onchoose(iso);
  }

  function handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        setFocus(addDays(focusIso, -1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        setFocus(addDays(focusIso, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocus(addDays(focusIso, -7));
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocus(addDays(focusIso, 7));
        break;
      case 'Home':
        event.preventDefault();
        setFocus(startOfWeekIso(focusIso));
        break;
      case 'End':
        event.preventDefault();
        setFocus(endOfWeekIso(focusIso));
        break;
      case 'PageUp':
        event.preventDefault();
        setFocus(addMonths(focusIso, event.shiftKey ? -12 : -1));
        break;
      case 'PageDown':
        event.preventDefault();
        setFocus(addMonths(focusIso, event.shiftKey ? 12 : 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(focusIso);
        break;
      case 'Escape':
        event.preventDefault();
        onclose();
        break;
    }
  }

  onMount(() => {
    void tick().then(() => focusButton(focusIso));
  });
</script>

<div {id} class="calendar" role="dialog" aria-label={label ? `${label} calendar` : 'Date calendar'}>
  <div class="head">
    <button class="nav" type="button" aria-label="Previous month" onclick={() => shiftMonth(-1)}>
      <ChevronLeft size={16} aria-hidden="true" />
    </button>
    <button
      class="month"
      type="button"
      aria-expanded={jumping}
      aria-controls={`${id}-jump`}
      bind:this={monthButton}
      onclick={toggleJump}
    >
      <span aria-live="polite">{monthLabel(view.year, view.month)}</span>
      <ChevronDown size={13} aria-hidden="true" />
    </button>
    <button class="nav" type="button" aria-label="Next month" onclick={() => shiftMonth(1)}>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </div>

  {#if jumping}
    <div
      class="jump"
      id={`${id}-jump`}
      role="toolbar"
      tabindex="-1"
      aria-orientation="horizontal"
      aria-label="Choose a month and year"
      onkeydown={handleJumpKeydown}
    >
      <div class="jump-year">
        <button class="nav" type="button" aria-label="Previous year" onclick={() => shiftYear(-1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span class="year">{view.year}</span>
        <button class="nav" type="button" aria-label="Next year" onclick={() => shiftYear(1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div class="months">
        {#each MONTH_NAMES as name, index (name)}
          <button
            class="jump-month"
            class:is-view={index === view.month}
            type="button"
            aria-current={index === view.month ? 'date' : undefined}
            onclick={() => jumpToMonth(index)}
          >
            {name}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if !jumping}
    <div class="weekdays" aria-hidden="true">
      {#each WEEKDAYS as weekday (weekday)}
        <span>{weekday}</span>
      {/each}
    </div>

    <div
      class="grid"
      role="grid"
      tabindex="-1"
      aria-label="Calendar days"
      bind:this={grid}
      onkeydown={handleKeydown}
    >
      {#each rows as row, rowIndex (rowIndex)}
        <div class="week" role="row">
          {#each row as cell (cell.iso)}
            <button
              class="day"
              class:is-outside={!cell.inMonth}
              class:is-today={cell.iso === today}
              class:is-selected={cell.iso === value}
              type="button"
              role="gridcell"
              tabindex={cell.iso === focusIso ? 0 : -1}
              aria-label={formatLongDate(cell.iso)}
              aria-selected={cell.iso === value}
              aria-current={cell.iso === today ? 'date' : undefined}
              data-date={cell.iso}
              onclick={() => choose(cell.iso)}
            >
              {cell.day}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  <div class="footer">
    <button class="today" type="button" onclick={() => choose(today)}>Today</button>
  </div>
</div>

<style>
  .calendar {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card-lg);
    box-shadow: var(--shadow-raised);
    padding: 10px;
    width: 100%;
  }

  .head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .month {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: inline-flex;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    gap: 3px;
    height: 28px;
    padding: 0 6px;
  }

  .month:hover {
    background: var(--surface-page);
  }

  .month[aria-expanded='true'] {
    background: var(--primary-subtle);
    color: var(--primary);
  }

  .jump {
    padding: 2px 0 4px;
  }

  .jump-year {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .year {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .months {
    display: grid;
    gap: 2px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .jump-month {
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 12px;
    height: 32px;
  }

  .jump-month:hover {
    background: var(--surface-page);
  }

  .jump-month[aria-current='date'] {
    background: var(--primary-subtle);
    color: var(--primary);
    font-weight: 600;
  }

  .nav {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .nav:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .weekdays,
  .week {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .weekdays span {
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.04em;
    padding: 4px 0;
    text-align: center;
    text-transform: uppercase;
  }

  .week {
    gap: 2px;
    margin-bottom: 2px;
  }

  .day {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: flex;
    font-family: var(--font-ui);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    height: 32px;
    justify-content: center;
    width: 100%;
  }

  .day:hover {
    background: var(--surface-page);
  }

  .day.is-outside {
    color: var(--text-disabled);
  }

  .day.is-today:not(.is-selected) {
    box-shadow: inset 0 0 0 1px var(--primary);
    color: var(--primary);
    font-weight: 600;
  }

  .day.is-selected {
    background: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
  }

  .footer {
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
    padding-top: 6px;
  }

  .today {
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--link);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    height: 28px;
    padding: 0 8px;
  }

  .today:hover {
    background: var(--primary-subtle);
  }
</style>

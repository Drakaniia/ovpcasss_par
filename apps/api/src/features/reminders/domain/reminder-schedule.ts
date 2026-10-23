/**
 * Reminder cadence (spec §11, §14): seven days after the record is created, then
 * once a week, at most three reminders per person in charge. The reminder state
 * lives in the outbox (`REMINDER` rows that reached `SENT`), so nothing here
 * needs its own table.
 */
export const REMINDER_AFTER_DAYS = 7;

/** The gap between one reminder and the next. */
export const REMINDER_INTERVAL_DAYS = 7;

export const MAX_REMINDERS = 3;

const DAY_MS = 86_400_000;

function elapsedDays(fromIso: string, now: Date): number | null {
  const from = Date.parse(fromIso);
  if (!Number.isFinite(from)) return null;
  return (now.getTime() - from) / DAY_MS;
}

export interface ReminderState {
  /** When the office registered the record. */
  createdAt: string;
  /** Reminders already sent to this person in charge. */
  sentCount: number;
  /** When the most recent of those was sent; null when none has. */
  lastSentAt: string | null;
  now: Date;
}

/**
 * True when another reminder is due. The first one waits seven days from
 * creation; each later one waits seven days from its predecessor, so a daily
 * sweep can never burn the allowance in three days.
 */
export function shouldRemind(state: ReminderState): boolean {
  if (state.sentCount >= MAX_REMINDERS) return false;

  const since = state.sentCount === 0 ? state.createdAt : state.lastSentAt;
  if (!since) return false;

  const days = elapsedDays(since, state.now);
  if (days === null) return false;

  return days >= (state.sentCount === 0 ? REMINDER_AFTER_DAYS : REMINDER_INTERVAL_DAYS);
}

/** Whole days the narrative has been waiting, for the message copy. */
export function waitingDays(createdAt: string, now: Date): number {
  const days = elapsedDays(createdAt, now);
  return days === null || days < 0 ? 0 : Math.floor(days);
}

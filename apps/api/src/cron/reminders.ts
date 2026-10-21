import { QUEUE_AGE_ATTENTION_DAYS } from '@par/shared';

import type { Env } from '../env';
import {
  sendReminders,
  type ReminderSummary,
} from '../features/reminders/application/send-reminders';

/** The sweep runs inside the hourly cron, gated to one hour a day in Manila. */
export const DEFAULT_REMINDER_HOUR = 9;

function manilaHour(now: Date): number {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(now);

  return Number(formatted);
}

/**
 * Pure and testable: the cron expression stays hourly, and only this decides
 * whether the reminder work runs (email spec §10.2).
 */
export function reminderWindowMatches(now: Date, hour = DEFAULT_REMINDER_HOUR): boolean {
  return manilaHour(now) === hour;
}

/** `REMINDER_AFTER_WORKING_DAYS` overrides the shared queue rule when set. */
export function reminderThreshold(env: Env): number {
  const parsed = Number(env.REMINDER_AFTER_WORKING_DAYS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : QUEUE_AGE_ATTENTION_DAYS;
}

export function reminderHour(env: Env): number {
  const parsed = Number(env.REMINDER_LOCAL_HOUR);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_REMINDER_HOUR;
}

/**
 * Runs the sweep when the Manila hour matches, and logs one structured summary
 * either way so an empty run is distinguishable from a job that never ran.
 */
export async function runReminderSweep(
  env: Env,
  now = new Date(),
): Promise<ReminderSummary | null> {
  if (!reminderWindowMatches(now, reminderHour(env))) return null;

  const summary = await sendReminders(env, now, reminderThreshold(env));

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Reminder sweep finished',
      ...summary,
      at: now.toISOString(),
    }),
  );

  return summary;
}

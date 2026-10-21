import { QUEUE_AGE_ATTENTION_DAYS, workingDaysSince } from '@par/shared';

export type ReminderQueueKind = 'review' | 'approval';

/** One report waiting in a queue, with the clock the queue screen shows. */
export interface WaitingReport {
  id: string;
  trackingNumber: string | null;
  title: string;
  ownerUserId: string;
  submitterName: string;
  since: string;
}

export interface DueReminder extends WaitingReport {
  queue: ReminderQueueKind;
  workingDays: number;
}

export interface SelectDueInput {
  now: Date;
  /** Working days before a reminder; defaults to the queue's attention rule. */
  threshold?: number;
  review: readonly WaitingReport[];
  approval: readonly WaitingReport[];
  /** Report id → when its last reminder was actually sent. */
  lastSent: ReadonlyMap<string, string>;
}

/**
 * Which reports are due a reminder (email spec §10.1). Pure: the caller loads
 * the rows and the last-sent dates. The working-day rule is the same one that
 * colours the queue, so a reminder can never contradict the age on screen.
 *
 * A report is due when it has waited at least the threshold, and not due again
 * until the same threshold has passed since the previous reminder.
 */
export function selectDueReminders(input: SelectDueInput): DueReminder[] {
  const threshold = input.threshold ?? QUEUE_AGE_ATTENTION_DAYS;
  const candidates: { report: WaitingReport; queue: ReminderQueueKind }[] = [
    ...input.review.map((report) => ({ report, queue: 'review' as const })),
    ...input.approval.map((report) => ({ report, queue: 'approval' as const })),
  ];

  const due: DueReminder[] = [];

  for (const { report, queue } of candidates) {
    if (!report.trackingNumber) continue;

    const workingDays = workingDaysSince(report.since, input.now);
    if (workingDays < threshold) continue;

    const last = input.lastSent.get(report.id);
    if (last && workingDaysSince(last, input.now) < threshold) continue;

    due.push({ ...report, queue, workingDays });
  }

  return due;
}

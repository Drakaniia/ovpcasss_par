import {
  createAttachmentQueries,
  createDb,
  createEmailTokenQueries,
  createRateLimitQueries,
  createSessionQueries,
} from '@par/db';

import type { Env } from '../env';
import { runBackup, type BackupResult } from './backup';
import { runCleanup, type CleanupCounts } from './cleanup';

/**
 * Cron entry point (spec §7.1). Two schedules share one Worker: the hourly
 * sweep, and a daily export that is the second copy beside D1 Time Travel.
 * Both expressions must stay in step with `triggers.crons` in `wrangler.toml`.
 */
export const CLEANUP_CRON = '17 * * * *';
export const BACKUP_CRON = '30 18 * * *';

export type ScheduledJob = 'cleanup' | 'backup';

export function jobForCron(cron: string): ScheduledJob {
  return cron === BACKUP_CRON ? 'backup' : 'cleanup';
}

export async function runScheduledJob(
  job: ScheduledJob,
  env: Env,
  now = new Date(),
): Promise<CleanupCounts | BackupResult> {
  if (job === 'backup') {
    const result = await runBackup({ db: env.DB, bucket: env.BUCKET }, now);
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'D1 backup written',
        ...result,
        at: now.toISOString(),
      }),
    );
    return result;
  }

  const db = createDb(env.DB);
  const result = await runCleanup(
    {
      queries: {
        sessions: createSessionQueries(db),
        tokens: createEmailTokenQueries(db),
        rateLimits: createRateLimitQueries(db),
        attachments: createAttachmentQueries(db),
      },
      bucket: env.BUCKET,
    },
    now,
  );

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Cleanup finished',
      ...result,
      at: now.toISOString(),
    }),
  );
  return result;
}

export async function scheduled(controller: ScheduledController, env: Env): Promise<void> {
  await runScheduledJob(jobForCron(controller.cron), env, new Date(controller.scheduledTime));
}

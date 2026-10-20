import { app } from './app';
import { scheduled } from './cron/scheduled';
import { emailQueueHandler } from './email/queue';
import type { Env } from './env';

/**
 * One Worker: HTTP for `/api/v1`, the consumer for the outbound email queue,
 * and the cron entry point for cleanup and the daily D1 export (spec §7.1).
 */
export default {
  fetch: app.fetch,
  queue: emailQueueHandler,
  scheduled,
} satisfies ExportedHandler<Env>;

import { createDb, createEmailOutboxQueries, createUserQueries } from '@par/db';
import { failureDigestTemplate } from '@par/email';

import { createEmailProvider } from '../../../email/provider';
import type { Env } from '../../../env';

const DIGEST_FAILURE_LIMIT = 3;

/**
 * The daily failure digest (email spec §9.5): one message per active Admin, and
 * only when something failed. It goes **directly** through the provider, not the
 * queue, because mailing a failure report through the failing path is circular.
 * A direct-send failure is logged and nothing else happens.
 */
export async function sendFailureDigest(env: Env, now = new Date()): Promise<number> {
  const db = createDb(env.DB);
  const outbox = createEmailOutboxQueries(db);
  const count = await outbox.countFailed();
  if (count === 0) return 0;

  const [recent, admins] = await Promise.all([
    outbox.list({ status: 'FAILED', page: 1, size: DIGEST_FAILURE_LIMIT }),
    createUserQueries(db).listActiveByRole('ADMIN'),
  ]);

  const content = failureDigestTemplate({
    count,
    failures: recent.rows.map((row) => ({
      kind: row.kind,
      to: row.to,
      error: row.lastError ?? 'No reason was recorded',
    })),
    ...(env.APP_ORIGIN ? { origin: env.APP_ORIGIN } : {}),
  });

  const provider = createEmailProvider(env);
  const day = now.toISOString().slice(0, 10);

  for (const admin of admins) {
    try {
      await provider.send({
        to: admin.email,
        ...content,
        idempotencyKey: `digest-${day}-${admin.id}`,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Failure digest could not be sent',
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
  }

  return admins.length;
}

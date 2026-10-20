import {
  createAttachmentQueries,
  createAuditQueries,
  createDb,
  createReferenceQueries,
  createReportReadQueries,
  createReportWriteQueries,
  createUserQueries,
} from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { createId } from '../../../lib/ids';
import type { Viewer } from '../domain/report-access';
import type { TransitionActor } from './report-events';
import type { WorkflowDependencies } from './report-workflow';

/** One request's database stack; every report route builds it the same way. */
export function reportDependencies(c: Context<AppEnv>) {
  const db = createDb(c.env.DB);

  return {
    db,
    read: createReportReadQueries(db),
    write: createReportWriteQueries(db),
    attachments: createAttachmentQueries(db),
    users: createUserQueries(db),
    audit: createAuditQueries(db),
    references: createReferenceQueries(db),
  };
}

/** The acting account's name and id, or null when the session is stale. */
export async function transitionActor(
  c: Context<AppEnv>,
  users: ReturnType<typeof createUserQueries>,
): Promise<TransitionActor | null> {
  const userId = c.get('userId');
  if (!userId) return null;

  const user = await users.findById(userId);
  return user ? { id: user.id, fullName: user.fullName } : null;
}

/** Workflow dependencies, including the admin-editable attachment rules. */
export async function workflowFor(
  c: Context<AppEnv>,
  stack = reportDependencies(c),
): Promise<WorkflowDependencies> {
  const requirements = await stack.references.list('attachment-requirements');

  return {
    read: stack.read,
    write: stack.write,
    attachments: stack.attachments,
    users: stack.users,
    requirements,
    env: c.env,
    now: new Date().toISOString(),
  };
}

export function viewerOf(c: Context<AppEnv>): Viewer | null {
  const userId = c.get('userId');
  if (!userId) return null;
  return { userId, role: c.get('role') };
}

/** A new attachment key never carries a user-provided name (spec §7.8). */
export function attachmentObjectKey(reportId: string): string {
  return `reports/${reportId}/${createId()}`;
}


import {
  createAttachmentQueries,
  createAuditQueries,
  createDb,
  createReceiptQueries,
  createReportReadQueries,
  createReportWriteQueries,
  createUserQueries,
} from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { createId } from '../../../lib/ids';
import type { Viewer } from '../domain/report-access';

/** One request's database stack; sub-resource routes build it the same way. */
export function reportDependencies(c: Context<AppEnv>) {
  const db = createDb(c.env.DB);

  return {
    db,
    read: createReportReadQueries(db),
    write: createReportWriteQueries(db),
    attachments: createAttachmentQueries(db),
    users: createUserQueries(db),
    audit: createAuditQueries(db),
    receipts: createReceiptQueries(db),
  };
}

export function viewerOf(c: Context<AppEnv>): Viewer | null {
  const userId = c.get('userId');
  if (!userId) return null;
  return { userId, role: c.get('role') };
}

/** A new attachment key never carries a user-provided name. */
export function attachmentObjectKey(reportId: string): string {
  return `reports/${reportId}/${createId()}`;
}

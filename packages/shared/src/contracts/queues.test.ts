import { describe, expect, it } from 'vitest';

import { decisionNoteSchema, returnReportSchema } from './decisions';
import { queueQuerySchema, queueItemSchema, queueResponseSchema } from './queues';

const item = {
  id: 'r1',
  ownerUserId: 'u1',
  submitterName: 'M. Santos',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  waitingSince: '2026-03-14T01:12:00.000Z',
};

describe('queue contracts', () => {
  it('defaults to the backlog order, first page, 25 rows', () => {
    const query = queueQuerySchema.parse({});

    expect(query).toEqual({ sort: 'oldest', page: 1, size: 25 });
  });

  it('rejects an unknown sort instead of guessing one', () => {
    expect(queueQuerySchema.safeParse({ sort: 'newest-first' }).success).toBe(false);
  });

  it('treats a missing attachments flag as nothing pending', () => {
    const parsed = queueItemSchema.parse(item);
    expect(parsed.hasPendingAttachments).toBe(false);
  });

  it('requires the facts the queue row and the return copy need', () => {
    expect(queueItemSchema.safeParse({ ...item, submitterName: undefined }).success).toBe(false);
    expect(queueItemSchema.safeParse({ ...item, college: '' }).success).toBe(false);
  });

  it('carries the header summary alongside the page', () => {
    const parsed = queueResponseSchema.parse({
      items: [item],
      total: 4,
      page: 1,
      size: 25,
      oldestAgeDays: 3,
      facets: { campuses: [], colleges: [] },
    });

    expect(parsed.oldestAgeDays).toBe(3);
    expect(parsed.items).toHaveLength(1);
  });
});

describe('decision contracts', () => {
  it('accepts an endorse or approve note as optional', () => {
    expect(decisionNoteSchema.safeParse({}).success).toBe(true);
    expect(decisionNoteSchema.parse({ note: '  Received complete attachments.  ' }).note).toBe(
      'Received complete attachments.',
    );
  });

  it('rejects a note over the limit', () => {
    expect(decisionNoteSchema.safeParse({ note: 'a'.repeat(4001) }).success).toBe(false);
  });

  it('requires a return comment of at least one character', () => {
    expect(returnReportSchema.safeParse({ comments: '   ' }).success).toBe(false);
    expect(returnReportSchema.parse({ comments: 'Missing receipts.' }).comments).toBe(
      'Missing receipts.',
    );
  });

  it('notifies the submitter unless the reviewer unchecks it', () => {
    expect(returnReportSchema.parse({ comments: 'Missing receipts.' }).notifySubmitter).toBe(true);
    expect(
      returnReportSchema.parse({ comments: 'Missing receipts.', notifySubmitter: false })
        .notifySubmitter,
    ).toBe(false);
  });

  it('caps a return comment at 4000 characters', () => {
    expect(returnReportSchema.safeParse({ comments: 'a'.repeat(4000) }).success).toBe(true);
    expect(returnReportSchema.safeParse({ comments: 'a'.repeat(4001) }).success).toBe(false);
  });
});

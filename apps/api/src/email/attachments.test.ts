import { describe, expect, it } from 'vitest';

import type { Env } from '../env';
import {
  DEFAULT_MAX_ATTACHMENT_BYTES,
  applyAttachmentBudget,
  loadAttachments,
  maxAttachmentBytes,
} from './attachments';

const ref = {
  objectKey: 'acknowledgements/report-1.pdf',
  filename: 'OVPCASSS-Acknowledgement-OFF-2026-0014.pdf',
  contentType: 'application/pdf',
  size: 3,
};

function envWith(object: { body: Uint8Array; size: number } | null, cap?: string): Env {
  return {
    EMAIL_MAX_ATTACHMENT_BYTES: cap,
    BUCKET: {
      async get() {
        if (!object) return null;
        return { arrayBuffer: async () => object.body.buffer, size: object.size };
      },
    },
  } as unknown as Env;
}

describe('applyAttachmentBudget', () => {
  it('keeps an attachment inside the budget', () => {
    expect(applyAttachmentBudget([ref], 1024)).toEqual({ refs: [ref], omitted: false });
  });

  it('drops an attachment over the budget and says so', () => {
    expect(applyAttachmentBudget([ref], 2)).toEqual({ refs: [], omitted: true });
  });

  it('omits nothing when there is nothing to attach', () => {
    expect(applyAttachmentBudget([], 2)).toEqual({ refs: [], omitted: false });
  });

  it('defaults to eight mebibytes and accepts a configured cap', () => {
    expect(DEFAULT_MAX_ATTACHMENT_BYTES).toBe(8 * 1024 * 1024);
    expect(maxAttachmentBytes(envWith(null))).toBe(DEFAULT_MAX_ATTACHMENT_BYTES);
    expect(maxAttachmentBytes(envWith(null, '1024'))).toBe(1024);
    expect(maxAttachmentBytes(envWith(null, 'not a number'))).toBe(DEFAULT_MAX_ATTACHMENT_BYTES);
  });
});

describe('loadAttachments', () => {
  it('reads the bytes from R2', async () => {
    const attachments = await loadAttachments(
      envWith({ body: new Uint8Array([1, 2, 3]), size: 3 }),
      [ref],
    );

    expect(attachments).toEqual([
      {
        filename: ref.filename,
        contentType: 'application/pdf',
        content: new Uint8Array([1, 2, 3]),
      },
    ]);
  });

  it('throws when the object is missing so the message is retried', async () => {
    await expect(loadAttachments(envWith(null), [ref])).rejects.toThrow(/missing from storage/);
  });

  it('returns an empty list when there are no references', async () => {
    expect(await loadAttachments(envWith(null), undefined)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { failedRowKeepsServerCopy, type AttachmentItem } from './attachment-items';

const ROW: AttachmentItem = {
  key: 'row-1',
  id: null,
  fileName: 'attendance.pdf',
  size: 2048,
  mimeType: 'application/pdf',
  label: '',
  status: 'FAILED',
  progress: 0,
  error: 'The upload failed with status 403.',
};

describe('failedRowKeepsServerCopy', () => {
  it('is true only while a failed row still points at a server record', () => {
    expect(failedRowKeepsServerCopy({ ...ROW, id: 'attachment-1' })).toBe(true);
    expect(failedRowKeepsServerCopy(ROW)).toBe(false);
  });

  it('ignores rows in another state even when they have an id', () => {
    expect(failedRowKeepsServerCopy({ ...ROW, id: 'attachment-1', status: 'PENDING' })).toBe(false);
    expect(failedRowKeepsServerCopy({ ...ROW, id: 'attachment-1', status: 'CONFIRMED' })).toBe(
      false,
    );
  });
});

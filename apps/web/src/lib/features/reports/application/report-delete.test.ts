import { describe, expect, it } from 'vitest';

import { deletionMessage } from './report-delete';

describe('deletionMessage', () => {
  it('names the deleted AR No. and the one the next record takes', () => {
    expect(
      deletionMessage({
        referenceNo: 'AR No. 0007',
        renumbered: 0,
        nextReferenceNo: 'AR No. 0007',
        receiptsVoided: 0,
      }),
    ).toBe('AR No. 0007 deleted. The next record will be AR No. 0007.');
  });

  it('says how many records moved down one', () => {
    expect(
      deletionMessage({
        referenceNo: 'AR No. 0007',
        renumbered: 4,
        nextReferenceNo: 'AR No. 0011',
        receiptsVoided: 2,
      }),
    ).toBe('AR No. 0007 deleted. 4 records moved down one; the next record will be AR No. 0011.');
  });

  it('reads one moved record in the singular', () => {
    const message = deletionMessage({
      referenceNo: 'AR No. 0007',
      renumbered: 1,
      nextReferenceNo: 'AR No. 0008',
      receiptsVoided: 0,
    });

    expect(message).toContain('1 record moved down one');
    expect(message).toContain('AR No. 0008');
  });
});

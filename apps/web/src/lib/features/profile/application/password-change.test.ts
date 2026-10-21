import { describe, expect, it } from 'vitest';

import { ApiError } from '$lib/api/http';

import { passwordChangeFailure } from './password-change';

describe('password change failure', () => {
  it('puts a wrong current password on that field', () => {
    const failure = passwordChangeFailure(
      new ApiError(400, 'PASSWORD_CURRENT_MISMATCH', 'The current password is incorrect.'),
    );

    expect(failure).toEqual({
      kind: 'field',
      field: 'currentPassword',
      message: 'The current password is incorrect.',
    });
  });

  it('keeps any other server failure on the retryable alert', () => {
    const failure = passwordChangeFailure(new ApiError(500, 'INTERNAL_ERROR', 'boom'));

    expect(failure).toEqual({
      kind: 'alert',
      message: 'We could not update your password. Try again.',
    });
  });

  it('reports a connection problem when the server is unreachable', () => {
    const failure = passwordChangeFailure(new TypeError('Failed to fetch'));

    expect(failure).toEqual({
      kind: 'alert',
      message: 'We could not reach the server. Check your connection and try again.',
    });
  });
});

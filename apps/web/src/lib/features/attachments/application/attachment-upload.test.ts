import type { PresignResponse } from '@par/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { setSessionToken } from '$lib/api/http';

import { uploadErrorText } from './attachment-items';
import { uploadHeaders } from './attachment-upload';

function presign(patch: Partial<PresignResponse> = {}): PresignResponse {
  return {
    attachmentId: 'attachment-1',
    uploadUrl: 'http://localhost:8787/api/v1/reports/r1/attachments/a1/content',
    method: 'PUT',
    mode: 'proxy',
    headers: { 'content-type': 'image/png' },
    ...patch,
  };
}

afterEach(() => {
  setSessionToken(null);
});

describe('upload headers', () => {
  it('carries the desktop token when the API stores the file itself', () => {
    setSessionToken('opaque-token');

    expect(uploadHeaders(presign())).toEqual({
      'content-type': 'image/png',
      authorization: 'Bearer opaque-token',
    });
  });

  it('sends only the declared type to a presigned storage URL', () => {
    setSessionToken('opaque-token');

    expect(uploadHeaders(presign({ mode: 'presigned', uploadUrl: 'https://r2.example/x' }))).toEqual(
      { 'content-type': 'image/png' },
    );
  });

  it('sends the cookie session alone in the browser', () => {
    expect(uploadHeaders(presign())).toEqual({ 'content-type': 'image/png' });
  });
});

describe('upload error text', () => {
  it('names the API reason', () => {
    expect(uploadErrorText(new Error('This report cannot accept new files.'), 'fallback')).toBe(
      'This report cannot accept new files.',
    );
  });

  it('shows the message the desktop shell rejects with', () => {
    expect(uploadErrorText('The upload failed with status 401.', 'fallback')).toBe(
      'The upload failed with status 401.',
    );
  });

  it('falls back when there is nothing to show', () => {
    expect(uploadErrorText(undefined, 'fallback')).toBe('fallback');
    expect(uploadErrorText(new Error(''), 'fallback')).toBe('fallback');
    expect(uploadErrorText('   ', 'fallback')).toBe('fallback');
  });
});

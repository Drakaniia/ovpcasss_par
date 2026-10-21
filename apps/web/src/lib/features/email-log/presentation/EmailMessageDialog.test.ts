import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { EmailLogRow, EmailMessageResponse } from '@par/shared';

import EmailMessageDialog from './EmailMessageDialog.svelte';

const ROW: EmailLogRow = {
  id: 'row_1',
  kind: 'VERIFY',
  to: '2401115560@student.buksu.edu.ph',
  subject: '[OVPCASSS PAR] Verify your email address',
  status: 'FAILED',
  attempts: 6,
  lastError:
    'Resend rejected the message (403): {"message":"The buksu.edu.ph domain is not verified."}',
  reportId: null,
  createdAt: '2026-10-21T05:12:59.864Z',
  updatedAt: '2026-10-21T05:13:08.903Z',
  canResend: true,
};

const MESSAGE: EmailMessageResponse = {
  to: ROW.to,
  subject: ROW.subject,
  text: [
    'Good day.',
    '',
    'Verify your email address',
    'https://par-api.example.workers.dev/verify-email?token=abc123&email=maria%40buksu.edu.ph',
    '',
    'This message was sent by the OVPCASSS Paperless PAR system. Please do not reply.',
  ].join('\n'),
};

function renderDialog(
  props: {
    open?: boolean;
    row?: EmailLogRow | null;
    message?: EmailMessageResponse | null;
    loading?: boolean;
    error?: string | null;
  } = {},
) {
  return render(EmailMessageDialog, {
    props: {
      open: props.open ?? true,
      row: props.row !== undefined ? props.row : ROW,
      message: props.message !== undefined ? props.message : MESSAGE,
      loading: props.loading ?? false,
      error: props.error ?? null,
      onclose: () => {},
      onretry: () => {},
    },
  });
}

describe('EmailMessageDialog', () => {
  it('shows the stored copy with its link ready to copy', () => {
    const { body } = renderDialog();

    expect(body).toContain('Stored message');
    expect(body).toContain('Verify · 2401115560@student.buksu.edu.ph');
    expect(body).toContain('Links in this message');
    expect(body).toContain(
      'https://par-api.example.workers.dev/verify-email?token=abc123&amp;email=maria%40buksu.edu.ph',
    );
    expect(body).toContain('Message text');
  });

  it('says a message carries no link instead of showing an empty list', () => {
    const { body } = renderDialog({
      message: { ...MESSAGE, text: 'Your account is active.' },
    });

    expect(body).toContain('This message carries no link.');
    expect(body).not.toContain('Links in this message');
  });

  it('reports a copy that could not be read', () => {
    const { body } = renderDialog({
      message: null,
      error: 'The stored message is no longer available.',
    });

    expect(body).toContain('The stored message is no longer available.');
    expect(body).toContain('Try again');
  });
});

import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { EmailTemplatePreviewResponse } from '@par/shared';

import EmailPreviewPane from './EmailPreviewPane.svelte';
import type { PreviewTab } from '../application/email-messages.svelte';

const PREVIEW: EmailTemplatePreviewResponse = {
  subject: '[OVPCASSS PAR] AR No. 0001 — you are the personnel in charge',
  html: '<!doctype html><html><body><p>Good day.</p></body></html>',
  text: 'Good day.\n\nYou are the personnel in charge.',
};

function renderPane(tab: PreviewTab = 'html') {
  return render(EmailPreviewPane, {
    props: {
      preview: PREVIEW,
      tab,
      title: 'Assigned',
      loading: false,
      pending: false,
      error: null,
      onretry: () => {},
    },
  });
}

describe('EmailPreviewPane', () => {
  it('puts the rendered mail in a sandboxed, titled iframe', () => {
    const { body } = renderPane('html');

    expect(body).toContain('sandbox');
    expect(body).toContain('title="Preview of the Assigned message"');
    expect(body).toContain('srcdoc=');
    expect(body).toContain('Previewed with the sample record');
  });

  it('shows the tag chip ahead of the typed subject', () => {
    const { body } = renderPane('subject');

    expect(body).toContain('[OVPCASSS PAR]');
    expect(body).toContain('AR No. 0001 — you are the personnel in charge');
    expect(body).toContain('cannot be removed');
  });

  it('shows the plain-text part exactly as the console provider would print it', () => {
    const { body } = renderPane('text');

    expect(body).toContain('You are the personnel in charge.');
  });

  it('reports a failed render without clearing the last good one', () => {
    const { body } = render(EmailPreviewPane, {
      props: {
        preview: PREVIEW,
        tab: 'html',
        title: 'Assigned',
        loading: false,
        pending: false,
        error: 'The preview did not render.',
        onretry: () => {},
      },
    });

    expect(body).toContain('The preview did not render.');
    expect(body).toContain('srcdoc=');
  });
});

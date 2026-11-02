import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { EmailTemplateCopy, EmailTemplateDetail, EmailTemplateIssue } from '@par/shared';

import EmailMessageEditor from './EmailMessageEditor.svelte';

const COPY: EmailTemplateCopy = {
  subject: '{{referenceNo}} — you are the personnel in charge',
  heading: 'You are the personnel in charge',
  greeting: 'Good day.',
  intro: [
    { text: 'The office registered {{referenceNo}} for you.', when: null },
    { text: 'An account was created for this address.', when: 'newAccount' },
    { text: 'Open your dashboard to write the narrative.', when: 'existingAccount' },
  ],
  facts: {
    enabled: true,
    source: 'fixed',
    rows: [{ label: 'Reference', value: '{{referenceNo}}' }],
  },
  quote: null,
  action: {
    enabled: true,
    variants: [{ when: null, label: 'Open your dashboard', urlToken: '{{dashboardUrl}}' }],
  },
  footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
};

const DETAIL: EmailTemplateDetail = {
  kind: 'ASSIGNED',
  label: 'Assigned',
  audience: 'Every personnel in charge named on the record',
  edited: false,
  unreadable: false,
  copy: COPY,
  defaults: COPY,
  tokens: [
    { token: 'referenceNo', label: 'Reference no.', example: 'AR No. 0001' },
    { token: 'title', label: 'Activity', example: 'Coastal cleanup' },
    { token: 'dashboardUrl', label: 'Link to the dashboard', example: 'https://par.test/' },
  ],
  branches: [
    { key: 'newAccount', label: 'When an account was created for the recipient' },
    { key: 'existingAccount', label: 'When the recipient already has an account' },
  ],
  hasFacts: true,
  factsSource: 'fixed',
  hasQuote: false,
  hasAction: true,
  updatedAt: null,
  updatedByName: null,
};

function renderEditor(issues: EmailTemplateIssue[] = []) {
  return render(EmailMessageEditor, {
    props: { detail: DETAIL, draft: structuredClone(COPY), issues },
  });
}

describe('EmailMessageEditor', () => {
  it('draws the editable fields with the locked subject tag', () => {
    const { body } = renderEditor();

    expect(body).toContain('Subject');
    expect(body).toContain('[OVPCASSS PAR]');
    expect(body).toContain('Heading');
    expect(body).toContain('Greeting');
    expect(body).toContain('When an account was created for the recipient');
    expect(body).toContain('When the recipient already has an account');
    expect(body).toContain('Facts');
    expect(body).toContain('Button');
    expect(body).toContain('Footer');
    expect(body).toContain('Insert value');
    expect(body).toContain('are not editable');
  });

  it('offers each case its own paragraph and the button only the kind’s links', () => {
    const { body } = renderEditor();

    expect(body).toContain('An account was created for this address.');
    expect(body).toContain('Link to the dashboard');
    expect(body).not.toContain('Link to account creation');
  });

  it('summarises every issue above the fields', () => {
    const { body } = renderEditor([
      { path: 'subject', message: 'This message needs {{referenceNo}}.', token: 'referenceNo' },
    ]);

    expect(body).toContain('One field needs attention');
    expect(body).toContain('This message needs {{referenceNo}}.');
    expect(body).toContain('id="message-issues"');
  });

  it('does not draw a validation summary when the copy is clean', () => {
    const { body } = renderEditor();

    expect(body).not.toContain('field needs attention');
    expect(body).not.toContain('message-issues');
  });
});

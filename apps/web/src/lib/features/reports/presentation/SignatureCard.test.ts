import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import SignatureCard from './SignatureCard.svelte';

function renderCard(props: { signed: boolean; canEdit: boolean }): string {
  return render(SignatureCard, {
    props: {
      reportId: 'report-1',
      signed: props.signed,
      canEdit: props.canEdit,
      onchanged: () => {},
    },
  }).body;
}

describe('SignatureCard', () => {
  it('offers the draw and upload capture while the record is unsigned', () => {
    const html = renderCard({ signed: false, canEdit: true });

    expect(html).toContain('Signature capture');
    expect(html).toContain('Draw');
    expect(html).toContain('Upload');
    expect(html).toContain('Save signature');
    expect(html).not.toContain('Use my signature on file');
  });

  it('keeps the existing signature and offers replace and remove', () => {
    const html = renderCard({ signed: true, canEdit: true });

    expect(html).toContain('Replace signature');
    expect(html).toContain('Remove signature');
    expect(html).not.toContain('Signature capture');
  });

  it('shows no controls on a record the reader may not edit', () => {
    const signed = renderCard({ signed: true, canEdit: false });
    const unsigned = renderCard({ signed: false, canEdit: false });

    expect(signed).not.toContain('Replace signature');
    expect(signed).not.toContain('Remove signature');
    expect(signed).not.toContain('Signature capture');
    expect(unsigned).not.toContain('Signature capture');
    expect(unsigned).not.toContain('Save signature');
  });

  it('names the profile copy as a fallback, never as a button', () => {
    const html = renderCard({ signed: false, canEdit: true });

    expect(html).toContain('A signature saved in Settings is still used');
    expect(html).not.toContain('fromProfile');
    expect(html).not.toContain('Use my signature on file');
  });
});

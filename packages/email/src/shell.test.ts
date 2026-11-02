import { describe, expect, it } from 'vitest';

import { OFFICE_NAME, SHELL_COLORS, SIGNATURE_LINES } from './identity';
import { renderShell } from './shell';

const content = renderShell({
  subject: 'OFF-2026-0014 is ready for review',
  heading: 'A post-activity report is ready for review',
  intro: ['A post-activity report was submitted and is waiting for your review.'],
  facts: [{ label: 'Reference', value: 'OFF-2026-0014' }],
  quote: { label: 'Comments', body: 'Add the attendance sheet.\nCorrect the count.' },
  action: { label: 'Open the review queue', url: 'https://par.example.edu/review' },
  reference: 'OFF-2026-0014',
});

describe('renderShell', () => {
  it('tags every subject with the office tag', () => {
    expect(content.subject).toBe('[OVPCASSS PAR] OFF-2026-0014 is ready for review');
    expect(content.subject.length).toBeLessThanOrEqual(78);
  });

  it('carries the four-line signature block in both parts', () => {
    for (const line of SIGNATURE_LINES) {
      expect(content.text).toContain(line);
      expect(content.html).toContain(line);
    }
    expect(content.text).toContain('----');
  });

  it('escapes a report title instead of rendering it', () => {
    const hostile = renderShell({
      subject: 'x',
      heading: 'A report with <b>x</b>',
      intro: ['Title: <script>alert(1)</script> & "quoted"'],
    });

    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).not.toContain('<b>x</b>');
    expect(hostile.html).toContain('&lt;script&gt;');
    expect(hostile.html).toContain('&amp;');
    expect(hostile.text).toContain('<script>alert(1)</script>');
  });

  it('wraps a comment and quotes it in plain text', () => {
    expect(content.text).toContain('> Add the attendance sheet.');
    expect(content.text).toContain('> Correct the count.');
  });

  it('wraps body copy to the plain-text width', () => {
    const long = renderShell({
      subject: 'x',
      heading: 'h',
      intro: ['word '.repeat(60).trim()],
    });

    const body = long.text.split('\n').filter((line) => !SIGNATURE_LINES.includes(line as never));
    for (const line of body) {
      expect(line.length).toBeLessThanOrEqual(78);
    }
  });

  it('loads no external font, stylesheet, image, or tracking pixel when it has no logo', () => {
    expect(content.html).not.toMatch(/<link|<img|<style|@import|url\(/);
    expect(content.html).not.toContain('fonts.');
    expect(content.html).not.toContain('http://');
  });

  it('puts the hosted logo at the left of the band and drops the repeated wordmark', () => {
    const withLogo = renderShell({
      subject: 'x',
      heading: 'h',
      intro: ['i'],
      logoUrl: 'https://par.example.edu/brand/ovpcasss-logo-email.png',
    });

    expect(withLogo.html.match(/<img\b/g)).toHaveLength(1);
    expect(withLogo.html).toContain('src="https://par.example.edu/brand/ovpcasss-logo-email.png"');
    expect(withLogo.html).toContain('alt="OVPCASSS"');
    expect(withLogo.html).toContain(OFFICE_NAME);
    // The logo already spells the wordmark, so the band does not repeat it.
    expect(withLogo.html).not.toContain('letter-spacing:2px');
    expect(content.html).toContain('letter-spacing:2px');
    // The logo is the only remote asset: still no stylesheet, style block, or CSS URL.
    expect(withLogo.html).not.toMatch(/<link|<style|@import|url\(/);
    expect(withLogo.text).not.toContain('.png');
  });

  it('has no exclamation marks in the copy', () => {
    expect(content.text).not.toContain('!');
    // `<!doctype>` is markup; only the reader's visible text matters.
    expect(content.html.replace(/<[^>]+>/g, '')).not.toContain('!');
  });

  /**
   * The palette is written as literals because mail clients cannot read custom
   * properties. These are the tokens.css values (`--brand-navy-800`,
   * `--brand-gold-600`); changing one is a deliberate design decision.
   */
  it('uses the documented palette', () => {
    expect(SHELL_COLORS).toEqual({
      navy: '#1e2c52',
      gold: '#b8862b',
      ink: '#111827',
      body: '#374151',
      muted: '#6b7280',
      surface: '#f6efdd',
      page: '#ffffff',
    });
  });
});

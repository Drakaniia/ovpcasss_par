import { describe, expect, it } from 'vitest';

import { SIGNATURE_LINES } from './identity';
import { emailSamples, sampleFor } from './samples';
import { approvedTemplate, receiptTemplate, type ReportEventData } from './templates/report-events';

const REPORT: ReportEventData = {
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  origin: 'https://par.buksu.edu.ph',
};

describe('email samples', () => {
  it('covers every kind once', () => {
    const kinds = emailSamples().map((sample) => sample.kind);

    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toHaveLength(14);
  });

  it('renders both parts on the office shell', () => {
    for (const sample of emailSamples()) {
      expect(sample.content.subject.startsWith('[OVPCASSS PAR] ')).toBe(true);
      expect(sample.content.subject.length).toBeLessThanOrEqual(78);
      expect(sample.content.subject).not.toContain('!');

      for (const line of SIGNATURE_LINES) {
        expect(sample.content.text, sample.kind).toContain(line);
        expect(sample.content.html, sample.kind).toContain(line);
      }

      expect(sample.content.html, sample.kind).toContain('OVPCASSS');
      expect(sample.content.html, sample.kind).not.toMatch(/<link|<img|<style/);
      expect(sample.content.text, sample.kind).not.toContain('!');
    }
  });

  it('finds a sample by kind', () => {
    expect(sampleFor('RECEIPT')?.audience).toContain('submitter');
    expect(sampleFor('SUBMITTED')?.content.text).toContain('OFF-2026-0014');
  });

  it('claims an attachment only when one is carried', () => {
    expect(approvedTemplate({ ...REPORT, hasAttachment: true }).text).toContain(
      'The signed acknowledgement is attached.',
    );
    expect(approvedTemplate(REPORT).text).not.toContain('attached');
    expect(approvedTemplate({ ...REPORT, attachmentOmitted: true }).text).toContain(
      'available in the app',
    );
  });

  it('keeps the receipt free of the acknowledgement wording', () => {
    const receipt = receiptTemplate({ ...REPORT, hasAttachment: true });

    expect(receipt.subject).toBe('[OVPCASSS PAR] Submission received: OFF-2026-0014');
    expect(receipt.text).toContain('A copy of the report as filed is attached.');
    expect(receipt.text).not.toContain('acknowledgement');
  });
});

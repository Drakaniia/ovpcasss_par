import { describe, expect, it } from 'vitest';

import {
  attachmentSizeProblem,
  extensionOf,
  isAllowedAttachment,
  storedTypeAllowed,
} from './attachment-rules';

describe('attachment rules', () => {
  it('accepts PDFs and images', () => {
    expect(isAllowedAttachment('attendance.pdf', 'application/pdf')).toBe(true);
    expect(isAllowedAttachment('photo.JPG', 'image/jpeg')).toBe(true);
    expect(isAllowedAttachment('scan.png', 'image/png')).toBe(true);
    expect(isAllowedAttachment('scan.webp', 'image/webp')).toBe(true);
    expect(isAllowedAttachment('scan.gif', 'image/gif')).toBe(true);
  });

  it('rejects Office documents, archives, and text', () => {
    expect(
      isAllowedAttachment(
        'summary.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(false);
    expect(isAllowedAttachment('budget.xlsx', 'application/vnd.ms-excel')).toBe(false);
    expect(isAllowedAttachment('notes.txt', 'text/plain')).toBe(false);
    expect(isAllowedAttachment('photos.zip', 'application/zip')).toBe(false);
  });

  it('rejects executables and scripts by extension or type', () => {
    expect(isAllowedAttachment('setup.exe', 'application/pdf')).toBe(false);
    expect(isAllowedAttachment('notes.pdf', 'application/x-msdownload')).toBe(false);
    expect(isAllowedAttachment('script.js', 'text/javascript')).toBe(false);
  });

  it('trusts the stored type only when it is on the allowlist', () => {
    expect(storedTypeAllowed('application/pdf')).toBe(true);
    expect(storedTypeAllowed('application/pdf; charset=binary')).toBe(true);
    expect(storedTypeAllowed('application/x-msdownload')).toBe(false);
    expect(storedTypeAllowed('text/javascript')).toBe(false);
  });

  it('accepts a missing or generic stored type', () => {
    expect(storedTypeAllowed(undefined)).toBe(true);
    expect(storedTypeAllowed('application/octet-stream')).toBe(true);
  });

  it('reports empty and oversized files', () => {
    expect(attachmentSizeProblem(0)).not.toBeNull();
    expect(attachmentSizeProblem(26 * 1024 * 1024)).toContain('MB');
    expect(attachmentSizeProblem(1024)).toBeNull();
  });

  it('reads the extension without a dot', () => {
    expect(extensionOf('report.final.pdf')).toBe('pdf');
    expect(extensionOf('no-extension')).toBe('');
  });
});

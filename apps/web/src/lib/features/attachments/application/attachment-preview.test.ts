import { describe, expect, it } from 'vitest';

import { attachmentFilePath, attachmentTypeLabel, previewKind } from './attachment-preview';

function file(originalName: string, mimeType = 'application/octet-stream') {
  return { originalName, mimeType };
}

describe('previewKind', () => {
  it('classifies the formats an image tag can draw', () => {
    for (const name of ['scan.png', 'photo.jpg', 'photo.JPEG', 'chart.webp', 'seal.gif']) {
      expect(previewKind(file(name))).toBe('image');
    }
  });

  it('trusts a known image MIME when the extension is unusual', () => {
    expect(previewKind(file('pasted-image', 'image/jpeg'))).toBe('image');
  });

  it('classifies PDFs separately', () => {
    expect(previewKind(file('narrative.pdf', 'application/pdf'))).toBe('pdf');
  });

  it('groups Word, Excel, and PowerPoint as office files', () => {
    expect(previewKind(file('report.docx'))).toBe('office');
    expect(previewKind(file('students.xlsx'))).toBe('office');
    expect(previewKind(file('slides.pptx'))).toBe('office');
  });

  it('leaves everything else as a plain file', () => {
    expect(previewKind(file('notes.txt', 'text/plain'))).toBe('other');
    expect(previewKind(file('photos.zip', 'application/zip'))).toBe('other');
  });
});

describe('attachment labels', () => {
  it('names the type for the dialog and the row', () => {
    expect(attachmentTypeLabel(file('report.docx'))).toBe('Word document');
    expect(attachmentTypeLabel(file('scan.png'))).toBe('Image');
    expect(attachmentTypeLabel(file('bundle.zip'))).toBe('Archive');
  });

  it('builds the authenticated byte path', () => {
    expect(attachmentFilePath('rep_1', 'att_2')).toBe('/reports/rep_1/attachments/att_2/file');
  });
});

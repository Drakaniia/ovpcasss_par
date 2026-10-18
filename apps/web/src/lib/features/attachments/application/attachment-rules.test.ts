import { MAX_ATTACHMENT_BYTES } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  fileError,
  fileKind,
  formatFileSize,
  isOnServer,
  isPreviewable,
  statusLabel,
  statusTone,
  validateFiles,
} from './attachment-rules';

describe('file validation', () => {
  it('accepts an allowed file under the limit', () => {
    expect(fileError({ name: 'Attendance.pdf', size: 1024, type: 'application/pdf' })).toBeNull();
    expect(fileError({ name: 'setup.exe', size: 1024 })).toBe(
      'setup.exe is not an accepted file type.',
    );
  });

  it('names the file and the limit when it is too large', () => {
    expect(fileError({ name: 'Attendance.pdf', size: 31 * 1024 * 1024 })).toBe(
      'Attendance.pdf is 31 MB; the limit is 25 MB.',
    );
    expect(fileError({ name: 'Notes.txt', size: MAX_ATTACHMENT_BYTES })).toBeNull();
  });

  it('rejects an empty file', () => {
    expect(fileError({ name: 'Empty.pdf', size: 0 })).toBe('Empty.pdf is empty.');
  });

  it('splits accepted files from rejections', () => {
    const { accepted, rejected } = validateFiles([
      { name: 'Attendance.pdf', size: 2048 },
      { name: 'Photos.zip', size: 4096 },
      { name: 'setup.exe', size: 1024 },
      { name: 'Big.pdf', size: 31 * 1024 * 1024 },
    ]);

    expect(accepted.map((file) => file.name)).toEqual(['Attendance.pdf', 'Photos.zip']);
    expect(rejected.map((file) => file.name)).toEqual(['setup.exe', 'Big.pdf']);
  });
});

describe('file presentation', () => {
  it('formats sizes for the rejection message and the row', () => {
    expect(formatFileSize(31 * 1024 * 1024)).toBe('31 MB');
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1.2 MB');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(120)).toBe('120 B');
  });

  it('classifies files for the icon and preview rule', () => {
    expect(fileKind('Attendance.pdf')).toBe('pdf');
    expect(fileKind('Photos.JPG')).toBe('image');
    expect(fileKind('Budget.xlsx')).toBe('excel');
    expect(fileKind('Notes.unknown')).toBe('other');
    expect(isPreviewable('Attendance.pdf')).toBe(true);
    expect(isPreviewable('Photos.png')).toBe(true);
    expect(isPreviewable('Budget.xlsx')).toBe(false);
  });
});

describe('status chips', () => {
  it('maps every uploader state to a label and tone', () => {
    expect(statusLabel('UPLOADING')).toBe('Uploading');
    expect(statusLabel('PENDING')).toBe('Pending');
    expect(statusLabel('CONFIRMED')).toBe('Confirmed');
    expect(statusLabel('FAILED')).toBe('Failed');

    expect(statusTone('UPLOADING')).toBe('info');
    expect(statusTone('PENDING')).toBe('gold');
    expect(statusTone('CONFIRMED')).toBe('success');
    expect(statusTone('FAILED')).toBe('danger');
  });

  it('knows which rows have a server id', () => {
    expect(isOnServer('PENDING')).toBe(true);
    expect(isOnServer('CONFIRMED')).toBe(true);
    expect(isOnServer('UPLOADING')).toBe(false);
    expect(isOnServer('FAILED')).toBe(false);
  });
});

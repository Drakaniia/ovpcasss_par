import { describe, expect, it } from 'vitest';

import { clampZoom, MAX_ZOOM, MIN_ZOOM, parseStoredZoom, zoomIn, zoomLabel, zoomOut } from './zoom-limits';

describe('zoom limits', () => {
  it('clamps to the 50–200 % range', () => {
    expect(MIN_ZOOM).toBe(0.5);
    expect(MAX_ZOOM).toBe(2);
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(5)).toBe(2);
    expect(clampZoom(1.25)).toBe(1.25);
  });

  it('falls back to 100 % for an unusable value', () => {
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('steps by 10 % and stops at the ends', () => {
    expect(zoomIn(1)).toBe(1.1);
    expect(zoomOut(1)).toBe(0.9);
    expect(zoomIn(1.95)).toBe(2);
    expect(zoomOut(0.55)).toBe(0.5);
  });

  it('reads a stored scale, ignoring garbage', () => {
    expect(parseStoredZoom('1.3')).toBe(1.3);
    expect(parseStoredZoom(null)).toBe(1);
    expect(parseStoredZoom('wide')).toBe(1);
    expect(parseStoredZoom('9')).toBe(2);
  });

  it('labels the readout with a space before the sign', () => {
    expect(zoomLabel(1.25)).toBe('125 %');
    expect(zoomLabel(1)).toBe('100 %');
  });
});

import { describe, expect, it } from 'vitest';

import { thumbGeometry } from './overlay-scrollbars';

describe('thumbGeometry', () => {
  it('returns nothing when the axis cannot scroll', () => {
    expect(thumbGeometry(500, 500, 0, 400)).toBeNull();
    expect(thumbGeometry(0, 500, 0, 400)).toBeNull();
    expect(thumbGeometry(500, 1000, 0, 0)).toBeNull();
  });

  it('sizes the thumb from the visible fraction of the track', () => {
    expect(thumbGeometry(500, 1000, 0, 480)).toEqual({ length: 240, position: 0 });
  });

  it('tracks the scroll offset from edge to edge', () => {
    expect(thumbGeometry(500, 1000, 250, 480)?.position).toBeCloseTo(120);
    expect(thumbGeometry(500, 1000, 500, 480)?.position).toBe(240);
  });

  it('keeps a grabbable minimum and clamps out-of-range offsets', () => {
    expect(thumbGeometry(100, 100_000, 0, 400)?.length).toBe(28);
    expect(thumbGeometry(500, 1000, -50, 480)?.position).toBe(0);
    expect(thumbGeometry(500, 1000, 9000, 480)?.position).toBe(240);
  });
});

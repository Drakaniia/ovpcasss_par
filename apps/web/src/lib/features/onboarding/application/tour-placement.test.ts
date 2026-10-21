import { describe, expect, it } from 'vitest';

import { placeTooltip, spotlightRect, type Rect, type Size } from './tour-placement';

const viewport: Size = { width: 1280, height: 800 };
const tooltip: Size = { width: 340, height: 200 };

describe('spotlightRect', () => {
  it('pads the target by eight pixels', () => {
    expect(spotlightRect({ top: 100, left: 200, width: 300, height: 40 }, 8, viewport)).toEqual({
      top: 92,
      left: 192,
      width: 316,
      height: 56,
    });
  });

  it('clamps the hole to the viewport', () => {
    expect(spotlightRect({ top: 2, left: 2, width: 100, height: 50 }, 8, viewport)).toEqual({
      top: 0,
      left: 0,
      width: 110,
      height: 60,
    });

    expect(spotlightRect({ top: 780, left: 1270, width: 40, height: 40 }, 8, viewport)).toEqual({
      top: 772,
      left: 1262,
      width: 18,
      height: 28,
    });
  });
});

describe('placeTooltip', () => {
  function place(target: Rect, preferred: Parameters<typeof placeTooltip>[0]['preferred']) {
    return placeTooltip({ target, tooltip, viewport, preferred });
  }

  it('sits below a mid-viewport target, centered on it', () => {
    expect(place({ top: 100, left: 100, width: 200, height: 40 }, 'bottom')).toEqual({
      placement: 'bottom',
      top: 156,
      left: 30,
    });
  });

  it('flips above a target near the bottom', () => {
    expect(place({ top: 700, left: 400, width: 200, height: 60 }, 'bottom')).toEqual({
      placement: 'top',
      top: 484,
      left: 330,
    });
  });

  it('flips a right-hand titlebar target below when the side is too tight', () => {
    expect(place({ top: 20, left: 1100, width: 120, height: 30 }, 'right')).toMatchObject({
      placement: 'bottom',
      top: 66,
    });
  });

  it('honours a preferred side that fits', () => {
    expect(place({ top: 300, left: 400, width: 200, height: 40 }, 'left')).toMatchObject({
      placement: 'left',
      top: 220,
    });
  });

  it('clamps inside the margin on every side', () => {
    const placed = place({ top: 700, left: 0, width: 40, height: 60 }, 'bottom');

    expect(placed.top).toBeGreaterThanOrEqual(16);
    expect(placed.left).toBeGreaterThanOrEqual(16);
    expect(placed.left + tooltip.width).toBeLessThanOrEqual(viewport.width - 16);
  });

  it('keeps a card larger than the window non-negative', () => {
    const placed = placeTooltip({
      target: { top: 0, left: 0, width: 100, height: 100 },
      tooltip: { width: 800, height: 600 },
      viewport: { width: 400, height: 300 },
      preferred: 'auto',
    });

    expect(placed.top).toBeGreaterThanOrEqual(0);
    expect(placed.left).toBeGreaterThanOrEqual(0);
  });

  it('picks the roomiest side when the target fills the window', () => {
    const placed = placeTooltip({
      target: { top: 0, left: 0, width: 900, height: 600 },
      tooltip,
      viewport: { width: 1280, height: 600 },
      preferred: 'bottom',
    });

    expect(placed.placement).toBe('right');
    expect(placed.top).toBeGreaterThanOrEqual(0);
  });
});

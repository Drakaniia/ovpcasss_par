import { describe, expect, it } from 'vitest';

import {
  estimateBackground,
  inkBounds,
  isRemovableBackground,
  padBounds,
  removeBackground,
} from './signature-background';

/** A flat RGBA sheet with a dark rectangle for ink. */
function sheet(
  width: number,
  height: number,
  paper: [number, number, number],
  ink?: { left: number; top: number; width: number; height: number },
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    pixels[offset] = paper[0];
    pixels[offset + 1] = paper[1];
    pixels[offset + 2] = paper[2];
    pixels[offset + 3] = 255;
  }

  if (ink) {
    for (let y = ink.top; y < ink.top + ink.height; y += 1) {
      for (let x = ink.left; x < ink.left + ink.width; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 20;
        pixels[offset + 1] = 20;
        pixels[offset + 2] = 20;
      }
    }
  }

  return pixels;
}

describe('background estimate', () => {
  it('reads a light sheet as removable paper', () => {
    const estimate = estimateBackground(sheet(40, 20, [250, 249, 246]), 40, 20);

    expect(estimate.luma).toBeGreaterThan(0.55);
    expect(estimate.chroma).toBeLessThan(0.35);
    expect(isRemovableBackground(estimate)).toBe(true);
  });

  it('keeps a dark scan, where the signature itself is white', () => {
    const estimate = estimateBackground(sheet(40, 20, [30, 30, 32]), 40, 20);

    expect(isRemovableBackground(estimate)).toBe(false);
  });

  it('keeps a strongly coloured image such as a stamp', () => {
    const estimate = estimateBackground(sheet(40, 20, [46, 120, 220]), 40, 20);

    expect(estimate.chroma).toBeGreaterThan(0.35);
    expect(isRemovableBackground(estimate)).toBe(false);
  });
});

describe('alpha mask', () => {
  it('clears the paper, keeps the ink, and leaves the edge band partial', () => {
    const width = 12;
    const height = 8;
    // One anti-aliased edge pixel: 30 units per channel from the paper, which
    // sits inside the 24-72 band.
    const pixels = sheet(width, height, [250, 250, 250], {
      left: 4,
      top: 2,
      width: 3,
      height: 3,
    });
    const band = (6 * width + 3) * 4;
    pixels[band] = 220;
    pixels[band + 1] = 220;
    pixels[band + 2] = 220;

    removeBackground(pixels, { r: 250, g: 250, b: 250 });

    const alphaAt = (x: number, y: number) => pixels[(y * width + x) * 4 + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(5, 3)).toBe(255);
    expect(alphaAt(3, 6)).toBeGreaterThan(0);
    expect(alphaAt(3, 6)).toBeLessThan(255);
  });

  it('never makes an already transparent pixel opaque again', () => {
    const width = 4;
    const height = 4;
    const pixels = sheet(width, height, [250, 250, 250]);
    pixels[3] = 0;

    removeBackground(pixels, { r: 250, g: 250, b: 250 });

    expect(pixels[3]).toBe(0);
  });
});

describe('trim', () => {
  it('finds the ink box and pads it by 4% of the long edge', () => {
    const width = 200;
    const height = 100;
    const pixels = sheet(width, height, [250, 250, 250], {
      left: 50,
      top: 20,
      width: 100,
      height: 40,
    });

    removeBackground(pixels, { r: 250, g: 250, b: 250 });

    const bounds = inkBounds(pixels, width, height);
    expect(bounds).toEqual({ left: 50, top: 20, width: 100, height: 40 });

    // 4% of the 100 px long edge is 4 px on every side, clamped to the image.
    expect(padBounds(bounds!, width, height)).toEqual({
      left: 46,
      top: 16,
      width: 108,
      height: 48,
    });
  });

  it('reports nothing to trim when the whole image is paper', () => {
    const pixels = sheet(10, 10, [250, 250, 250]);

    removeBackground(pixels, { r: 250, g: 250, b: 250 });

    expect(inkBounds(pixels, 10, 10)).toBeNull();
  });
});

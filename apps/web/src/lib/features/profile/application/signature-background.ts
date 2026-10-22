/**
 * Uploaded signatures become ink on transparent paper (signature spec §4.5.1).
 * A phone photo or a scan arrives as a rectangle of white or grey paper, which
 * would print as a visible box on the facsimile, so the browser removes the
 * paper before the image is sent. The logic is pure and operates on RGBA bytes,
 * so it is testable without a DOM or a canvas.
 */

/** Below this luminance the "paper" is dark: a white signature on a dark scan. */
export const MIN_PAPER_LUMA = 0.55;
/** A strongly coloured border is a stamp or letterhead, not a sheet of paper. */
export const MAX_PAPER_CHROMA = 0.35;

/** Distance (0-255, RGB) below which a pixel is paper, and above which it is ink. */
const TRANSPARENT_BELOW = 24;
const OPAQUE_ABOVE = 72;
/** 0-255 alpha above which a pixel counts as ink when trimming. */
export const INK_ALPHA = 8;
/** Transparent margin trimmed around the ink, as a share of the long edge. */
export const TRIM_PADDING = 0.04;

export interface BackgroundColour {
  r: number;
  g: number;
  b: number;
}

export interface BackgroundEstimate extends BackgroundColour {
  /** 0-1 perceptual luminance of the border ring. */
  luma: number;
  /** 0-1 spread between the strongest and weakest channel. */
  chroma: number;
}

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The median border colour, approximated by the mean of the 1 px ring. The ring
 * is what a scan of paper always contains, so it is a better sample than the
 * whole image, which is mostly ink by definition.
 */
export function estimateBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): BackgroundEstimate {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const sample = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    r += pixels[index] ?? 0;
    g += pixels[index + 1] ?? 0;
    b += pixels[index + 2] ?? 0;
    count += 1;
  };

  for (let x = 0; x < width; x += 1) {
    sample(x, 0);
    if (height > 1) sample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sample(0, y);
    if (width > 1) sample(width - 1, y);
  }

  const divisor = Math.max(1, count);
  const colour = { r: r / divisor, g: g / divisor, b: b / divisor };
  const luma = (0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b) / 255;
  const strongest = Math.max(colour.r, colour.g, colour.b);
  const weakest = Math.min(colour.r, colour.g, colour.b);

  return { ...colour, luma, chroma: (strongest - weakest) / 255 };
}

/**
 * Only dark ink on a light, neutral sheet is removable. A dark sheet (white
 * signature), a coloured stamp, or a letterhead is kept as-is and the card says
 * so, because erasing it would delete the signature itself.
 */
export function isRemovableBackground(estimate: BackgroundEstimate): boolean {
  return estimate.luma >= MIN_PAPER_LUMA && estimate.chroma <= MAX_PAPER_CHROMA;
}

/**
 * Rewrites the alpha channel from the distance to the paper colour: paper
 * becomes fully transparent, ink stays fully opaque, and the 24-72 band keeps
 * edge pixels partly transparent so the stroke keeps its anti-aliasing. RGB is
 * untouched, so the ink keeps its colour.
 */
export function removeBackground(pixels: Uint8ClampedArray, estimate: BackgroundColour): void {
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const distance = Math.hypot(r - estimate.r, g - estimate.g, b - estimate.b);
    const alpha = Math.min(
      1,
      Math.max(0, (distance - TRANSPARENT_BELOW) / (OPAQUE_ABOVE - TRANSPARENT_BELOW)),
    );

    // Multiply, so an image that was already transparent stays transparent.
    const existing = (pixels[index + 3] ?? 255) / 255;
    pixels[index + 3] = Math.round(alpha * existing * 255);
  }
}

/** Bounding box of the pixels that still carry ink, or null when nothing does. */
export function inkBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = INK_ALPHA,
): Bounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((pixels[(y * width + x) * 4 + 3] ?? 0) <= threshold) continue;

      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** Grows the ink box by a small share of the long edge, clamped to the image. */
export function padBounds(
  bounds: Bounds,
  width: number,
  height: number,
  paddingRatio = TRIM_PADDING,
): Bounds {
  const longEdge = Math.max(bounds.width, bounds.height);
  const padding = Math.round(longEdge * paddingRatio);

  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(width, bounds.left + bounds.width + padding);
  const bottom = Math.min(height, bounds.top + bounds.height + padding);

  return { left, top, width: right - left, height: bottom - top };
}

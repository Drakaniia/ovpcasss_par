/**
 * Spotlight and tooltip geometry (onboarding spec §10.3). Pure functions in
 * viewport coordinates: the overlay lays out in CSS pixels, so no scroll maths
 * is needed after the target has been scrolled into view.
 */
export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Placement = 'top' | 'bottom' | 'left' | 'right';
export type TourPlacement = Placement | 'auto';

const DEFAULT_PADDING = 8;
const DEFAULT_GAP = 16;
const DEFAULT_MARGIN = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** The hole around a target: padded by 8 px, clamped to the viewport. */
export function spotlightRect(
  target: Rect,
  padding = DEFAULT_PADDING,
  viewport: Size = { width: 0, height: 0 },
): Rect {
  const top = Math.max(0, target.top - padding);
  const left = Math.max(0, target.left - padding);
  const right = Math.min(viewport.width, target.left + target.width + padding);
  const bottom = Math.min(viewport.height, target.top + target.height + padding);

  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

type PlaceInput = {
  /** The padded hole, not the raw target. */
  target: Rect;
  tooltip: Size;
  viewport: Size;
  preferred: TourPlacement;
  gap?: number;
  margin?: number;
};

/**
 * Chooses the side that fits the card, preferring the step's own side, then
 * bottom/top/right/left. When nothing fits, the roomiest side wins and the card
 * is clamped into the margin, where its own `max-height` takes over.
 */
export function placeTooltip(input: PlaceInput): {
  placement: Placement;
  top: number;
  left: number;
} {
  const { target, tooltip, viewport, preferred } = input;
  const gap = input.gap ?? DEFAULT_GAP;
  const margin = input.margin ?? DEFAULT_MARGIN;

  const space: Record<Placement, number> = {
    top: target.top - gap - margin,
    bottom: viewport.height - (target.top + target.height) - gap - margin,
    left: target.left - gap - margin,
    right: viewport.width - (target.left + target.width) - gap - margin,
  };

  const fits: Record<Placement, boolean> = {
    top: space.top >= tooltip.height,
    bottom: space.bottom >= tooltip.height,
    left: space.left >= tooltip.width,
    right: space.right >= tooltip.width,
  };

  const preference: Placement = preferred === 'auto' ? 'bottom' : preferred;
  const tried: Placement[] = [preference, 'bottom', 'top', 'right', 'left'];
  const placement =
    tried.find((side, index) => tried.indexOf(side) === index && fits[side]) ?? roomiest(space);

  const centeredLeft = target.left + (target.width - tooltip.width) / 2;
  const centeredTop = target.top + (target.height - tooltip.height) / 2;

  const raw = {
    bottom: { top: target.top + target.height + gap, left: centeredLeft },
    top: { top: target.top - gap - tooltip.height, left: centeredLeft },
    right: { top: centeredTop, left: target.left + target.width + gap },
    left: { top: centeredTop, left: target.left - gap - tooltip.width },
  }[placement];

  return {
    placement,
    top: clamp(raw.top, margin, viewport.height - tooltip.height - margin),
    left: clamp(raw.left, margin, viewport.width - tooltip.width - margin),
  };
}

function roomiest(space: Record<Placement, number>): Placement {
  const sides: Placement[] = ['bottom', 'top', 'right', 'left'];
  return sides.reduce((best, side) => (space[side] > space[best] ? side : best), 'bottom');
}

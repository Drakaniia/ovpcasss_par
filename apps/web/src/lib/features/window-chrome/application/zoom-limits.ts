/**
 * Zoom range and step arithmetic (desktop window chrome spec §8.4). Pure so the
 * clamp and the 10 % steps are testable without a webview.
 */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(scale * 100) / 100));
}

export function zoomIn(scale: number): number {
  return clampZoom(scale + ZOOM_STEP);
}

export function zoomOut(scale: number): number {
  return clampZoom(scale - ZOOM_STEP);
}

/** Reads a stored scale, falling back to 100 % for anything unusable. */
export function parseStoredZoom(raw: string | null): number {
  if (!raw) return 1;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? clampZoom(parsed) : 1;
}

/** "125 %" — the indicator and the menu reasons share one format. */
export function zoomLabel(scale: number): string {
  return `${Math.round(scale * 100)} %`;
}

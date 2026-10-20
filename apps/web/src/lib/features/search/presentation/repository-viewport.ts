/** Results and preview share the screen only when there is room for both (UI spec §12). */
export const PANE_MIN_WIDTH = 1440;

export function paneAvailable(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${PANE_MIN_WIDTH}px)`).matches
  );
}

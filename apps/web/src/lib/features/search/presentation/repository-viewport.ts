/** The preview sits beside the list only at desktop widths (UI spec §12). */
export const PANE_MIN_WIDTH = 1024;

export function paneWide(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${PANE_MIN_WIDTH}px)`).matches
  );
}

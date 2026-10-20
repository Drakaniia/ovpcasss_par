import type { PhysicalRect, WindowChrome } from '../contracts';

/**
 * Browser parity (desktop window chrome spec §9.2): the app-drawn chrome still
 * exists, but the page cannot touch a window. Every window call is a no-op and
 * `controllable` is false, which is what hides the controls and the Window menu.
 * Full screen uses the Fullscreen API so F11 and the View item still work.
 */
export function createWindowChrome(): WindowChrome {
  return {
    shell: 'web',
    controllable: false,

    async minimize() {},
    async toggleMaximize() {},
    async isMaximized() {
      return false;
    },
    async close() {},
    async destroy() {},
    async isFullscreen() {
      return document.fullscreenElement !== null;
    },
    async setZoom() {},
    async openDevtools() {},
    async setMaximizeHitRect(_rect: PhysicalRect | null) {},

    async setFullscreen(on: boolean) {
      try {
        if (on && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else if (!on && document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Browsers refuse full screen without a user gesture; the key press that
        // got here is one, so a rejection means the ambient policy forbids it.
      }
    },

    onResized(listener: () => void) {
      window.addEventListener('resize', listener);
      return () => window.removeEventListener('resize', listener);
    },

    onCloseRequested(listener: (event: { preventDefault(): void }) => void) {
      const onBeforeUnload = (event: BeforeUnloadEvent) => {
        const guard = { allowed: true };
        listener({ preventDefault: () => (guard.allowed = false) });
        if (!guard.allowed) {
          event.preventDefault();
          event.returnValue = '';
        }
      };

      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    },

    onMaximizeHover() {
      return () => {};
    },
  };
}

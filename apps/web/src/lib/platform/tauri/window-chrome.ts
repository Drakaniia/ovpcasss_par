import type { PhysicalRect, WindowChrome } from '../contracts';

/**
 * Desktop window chrome (desktop window chrome spec §9.2). The Tauri modules are
 * imported lazily so the browser bundle never pays for them; every call reads
 * the current window/webview because the adapter is created before the shell
 * paints.
 */
export function createWindowChrome(): WindowChrome {
  const windowModule = () => import('@tauri-apps/api/window');
  const webviewModule = () => import('@tauri-apps/api/webview');

  async function currentWindow() {
    const { getCurrentWindow } = await windowModule();
    return getCurrentWindow();
  }

  return {
    shell: 'tauri',
    controllable: true,

    async minimize() {
      await (await currentWindow()).minimize();
    },

    async toggleMaximize() {
      await (await currentWindow()).toggleMaximize();
    },

    async isMaximized() {
      return (await currentWindow()).isMaximized();
    },

    async close() {
      await (await currentWindow()).close();
    },

    async destroy() {
      await (await currentWindow()).destroy();
    },

    async setFullscreen(on: boolean) {
      await (await currentWindow()).setFullscreen(on);
    },

    async isFullscreen() {
      return (await currentWindow()).isFullscreen();
    },

    async setZoom(scale: number) {
      const { getCurrentWebview } = await webviewModule();
      await getCurrentWebview().setZoom(scale);
    },

    async openDevtools() {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_devtools');
    },

    async setMaximizeHitRect(rect: PhysicalRect | null) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_maximize_hit_rect', { rect });
    },

    onResized(listener: () => void) {
      let unlisten: (() => void) | null = null;
      let disposed = false;

      void currentWindow()
        .then((window) => window.onResized(() => listener()))
        .then((stop) => {
          if (disposed) stop();
          else unlisten = stop;
        })
        .catch(() => {});

      return () => {
        disposed = true;
        unlisten?.();
      };
    },

    onCloseRequested(listener: (event: { preventDefault(): void }) => void) {
      let unlisten: (() => void) | null = null;
      let disposed = false;

      void currentWindow()
        .then((window) => window.onCloseRequested((event) => listener(event)))
        .then((stop) => {
          if (disposed) stop();
          else unlisten = stop;
        })
        .catch(() => {});

      return () => {
        disposed = true;
        unlisten?.();
      };
    },

    onMaximizeHover(listener: (hovering: boolean) => void) {
      let unlisten: (() => void) | null = null;
      let disposed = false;

      void import('@tauri-apps/api/event')
        .then(({ listen }) =>
          listen<boolean>('window-chrome:maximize-hover', (event) => listener(event.payload)),
        )
        .then((stop) => {
          if (disposed) stop();
          else unlisten = stop;
        })
        .catch(() => {});

      return () => {
        disposed = true;
        unlisten?.();
      };
    },
  };
}
